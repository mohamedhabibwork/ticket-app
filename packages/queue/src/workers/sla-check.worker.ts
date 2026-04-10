import { Worker, Job, Queue } from "bullmq";
import { eq, and, isNull, lte, gte, or } from "drizzle-orm";
import { db } from "@ticket-app/db";
import { slaPolicyTargets, ticketSla, tickets } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";

const SLA_CHECK_QUEUE = `${env.QUEUE_PREFIX}-sla-check`;

export interface SlaCheckJobData {
  type: "check-sla" | "check-breach";
  ticketId?: number;
  slaId?: number;
}

export interface BusinessHoursConfig {
  enabled: boolean;
  timezone: string;
  schedule: {
    dayOfWeek: number;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  }[];
}

export interface HolidayConfig {
  date: string;
  name: string;
}

const slaCheckQueue = new Queue<SlaCheckJobData>(SLA_CHECK_QUEUE, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export async function addSlaCheckJob(
  data: SlaCheckJobData,
  options?: { delay?: number; repeat?: { pattern: string } },
): Promise<Job<SlaCheckJobData>> {
  return slaCheckQueue.add("sla-check", data, {
    ...options,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function scheduleSlaCheck(intervalMinutes: number = 1): Promise<Job<SlaCheckJobData>> {
  const existing = await slaCheckQueue.getRepeatableJobs();
  for (const job of existing) {
    if (job.name === "sla-check") {
      // Use removeRepeatableByKey to remove the job
      await slaCheckQueue.removeRepeatableByKey(job.key);
    }
  }

  return slaCheckQueue.add(
    "sla-check",
    { type: "check-sla" },
    {
      repeat: { pattern: `*/${intervalMinutes} * * * *` },
      removeOnComplete: true,
    },
  );
}

export function createSlaCheckWorker(): Worker {
  return new Worker(
    SLA_CHECK_QUEUE,
    async (job: Job<SlaCheckJobData>) => {
      const { type, ticketId, slaId } = job.data;

      switch (type) {
        case "check-sla":
          await checkAllSlaTimers();
          break;
        case "check-breach":
          if (slaId) await checkSlaBreach(slaId);
          if (ticketId) await checkTicketSlaBreach(ticketId);
          break;
      }
    },
    {
      connection: getRedis(),
      concurrency: 5,
    },
  );
}

async function checkAllSlaTimers(): Promise<void> {
  console.log("[SLA-Check] Starting SLA timer check");

  const now = new Date();

  const activeTicketSlas = await db.query.ticketSla.findMany({
    where: and(
      isNull(ticketSla.firstResponseBreached),
      isNull(ticketSla.pausedAt),
      or(lte(ticketSla.firstResponseDueAt, now), lte(ticketSla.resolutionDueAt, now)),
    ),
    with: {
      ticket: {
        with: {
          organization: true,
          priority: true,
          status: true,
        },
      },
      slaPolicy: true,
    },
  });

  for (const ticketSlaItem of activeTicketSlas) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await processTicketSla(ticketSlaItem as any);
    } catch (error) {
      console.error(`[SLA-Check] Error processing SLA ${ticketSlaItem.id}:`, error);
    }
  }

  const upcomingDue = await db.query.ticketSla.findMany({
    where: and(
      isNull(ticketSla.firstResponseBreached),
      or(
        and(
          isNull(ticketSla.pausedAt),
          gte(ticketSla.firstResponseDueAt, new Date(now.getTime() - 15 * 60 * 1000)),
          lte(ticketSla.firstResponseDueAt, new Date(now.getTime() + 15 * 60 * 1000)),
        ),
        and(
          isNull(ticketSla.pausedAt),
          gte(ticketSla.resolutionDueAt, new Date(now.getTime() - 15 * 60 * 1000)),
          lte(ticketSla.resolutionDueAt, new Date(now.getTime() + 15 * 60 * 1000)),
        ),
      ),
    ),
    with: {
      ticket: {
        with: {
          contact: true,
          assignedAgent: true,
          status: true,
        },
      },
    },
  });

  for (const sla of upcomingDue) {
    await sendSlaWarningNotification(sla);
  }

  console.log(`[SLA-Check] Processed ${activeTicketSlas.length} SLAs`);
}

async function processTicketSla(
  ticketSlaData: typeof ticketSla.$inferSelect & {
    ticket: {
      id: number;
      createdAt: Date;
      firstResponseAt: Date | null;
      status: { name: string } | null;
    };
    slaPolicy: {
      businessHoursOnly: boolean;
      businessHoursConfig: BusinessHoursConfig | null;
      holidays: HolidayConfig[] | null;
    };
  },
): Promise<void> {
  const { ticket, slaPolicy } = ticketSlaData;

  if (ticket.status?.name === "resolved" || ticket.status?.name === "closed") {
    console.log(`[SLA-Check] Ticket ${ticket.id} is resolved/closed, skipping`);
    return;
  }

  let firstResponseDue = ticketSlaData.firstResponseDueAt;
  let resolutionDue = ticketSlaData.resolutionDueAt;

  const businessHoursConfig = slaPolicy.businessHoursConfig as BusinessHoursConfig | null;
  const holidays = (slaPolicy.holidays as HolidayConfig[] | null) || [];

  if (slaPolicy.businessHoursOnly && businessHoursConfig) {
    const effectiveFirstResponseDue = calculateBusinessHoursEnd(
      ticket.createdAt,
      getFirstResponseMinutes(ticketSlaData),
      businessHoursConfig,
      holidays,
    );
    const effectiveResolutionDue = calculateBusinessHoursEnd(
      ticket.createdAt,
      getResolutionMinutes(ticketSlaData),
      businessHoursConfig,
      holidays,
    );
    firstResponseDue = effectiveFirstResponseDue;
    resolutionDue = effectiveResolutionDue;
  }

  let firstResponseBreached = false;
  let resolutionBreached = false;
  let firstResponseBreachedAt: Date | null = null;
  let resolutionBreachedAt: Date | null = null;

  if (!ticket.firstResponseAt && new Date() > firstResponseDue) {
    firstResponseBreached = true;
    firstResponseBreachedAt = firstResponseDue;
    console.log(`[SLA-Check] First response breached for ticket ${ticket.id}`);
  }

  if (ticket.status?.name !== "resolved" && new Date() > resolutionDue) {
    resolutionBreached = true;
    resolutionBreachedAt = resolutionDue;
    console.log(`[SLA-Check] Resolution breached for ticket ${ticket.id}`);
  }

  if (firstResponseBreached || resolutionBreached) {
    await db
      .update(ticketSla)
      .set({
        firstResponseBreached,
        resolutionBreached,
        firstResponseBreachedAt: firstResponseBreachedAt,
        resolutionBreachedAt: resolutionBreachedAt,
        updatedAt: new Date(),
      })
      .where(eq(ticketSla.id, ticketSlaData.id));

    await triggerEscalation(ticket.id, ticketSlaData, {
      firstResponseBreached,
      resolutionBreached,
    });
  }
}

async function checkSlaBreach(slaId: number): Promise<void> {
  const sla = await db.query.ticketSla.findFirst({
    where: eq(ticketSla.id, slaId),
    with: {
      ticket: {
        with: {
          status: true,
        },
      },
      slaPolicy: true,
    },
  });

  if (!sla) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await processTicketSla(sla as any);
}

async function checkTicketSlaBreach(ticketId: number): Promise<void> {
  const sla = await db.query.ticketSla.findFirst({
    where: eq(ticketSla.ticketId, ticketId),
    with: {
      ticket: {
        with: {
          status: true,
        },
      },
      slaPolicy: true,
    },
  });

  if (!sla) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await processTicketSla(sla as any);
}

async function triggerEscalation(
  ticketId: number,
  ticketSlaData: { slaPolicyId: number },
  breachInfo: { firstResponseBreached: boolean; resolutionBreached: boolean },
): Promise<void> {
  const policyTargets = await db.query.slaPolicyTargets.findMany({
    where: eq(slaPolicyTargets.slaPolicyId, ticketSlaData.slaPolicyId),
    with: {
      escalateAgent: true,
      escalateTeam: true,
    },
  });

  for (const target of policyTargets) {
    if (breachInfo.firstResponseBreached && target.escalateAgentId) {
      console.log(`[SLA-Check] Escalating ticket ${ticketId} to agent ${target.escalateAgentId}`);
      await db
        .update(tickets)
        .set({ assignedAgentId: target.escalateAgentId })
        .where(eq(tickets.id, ticketId));
    }

    if (breachInfo.resolutionBreached && target.escalateTeamId) {
      console.log(`[SLA-Check] Escalating ticket ${ticketId} to team ${target.escalateTeamId}`);
      await db
        .update(tickets)
        .set({ assignedTeamId: target.escalateTeamId })
        .where(eq(tickets.id, ticketId));
    }
  }

  console.log(`[SLA-Check] Escalation triggered for ticket ${ticketId}`, breachInfo);
}

async function sendSlaWarningNotification(
  sla: typeof import("@ticket-app/db/schema").ticketSla.$inferSelect & {
    ticket: {
      contact: { email: string | null; firstName: string | null } | null;
      assignedAgent: { email: string | null; firstName: string | null } | null;
    };
  },
): Promise<void> {
  const now = new Date();
  const firstResponseWarning =
    sla.firstResponseDueAt &&
    !sla.firstResponseBreached &&
    sla.firstResponseDueAt.getTime() - now.getTime() <= 15 * 60 * 1000;

  const resolutionWarning =
    sla.resolutionDueAt &&
    !sla.resolutionBreached &&
    sla.resolutionDueAt.getTime() - now.getTime() <= 15 * 60 * 1000;

  if (firstResponseWarning || resolutionWarning) {
    console.log(`[SLA-Check] Sending warning notification for ticket ${sla.ticketId}`);
  }
}

function getFirstResponseMinutes(
  sla: typeof import("@ticket-app/db/schema").ticketSla.$inferSelect,
): number {
  return Math.floor((sla.firstResponseDueAt.getTime() - sla.createdAt.getTime()) / 60000);
}

function getResolutionMinutes(
  sla: typeof import("@ticket-app/db/schema").ticketSla.$inferSelect,
): number {
  return Math.floor((sla.resolutionDueAt.getTime() - sla.createdAt.getTime()) / 60000);
}

function calculateBusinessHoursEnd(
  startDate: Date,
  minutesToAdd: number,
  businessHours: BusinessHoursConfig,
  holidays: HolidayConfig[],
): Date {
  if (!businessHours.enabled) {
    return new Date(startDate.getTime() + minutesToAdd * 60000);
  }

  let remainingMinutes = minutesToAdd;
  let currentDate = new Date(startDate);

  while (remainingMinutes > 0) {
    const dayOfWeek = currentDate.getDay();
    const schedule = businessHours.schedule.find((s) => s.dayOfWeek === dayOfWeek);

    if (!schedule) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      continue;
    }

    const dateStr = currentDate.toISOString().split("T")[0];
    if (holidays.some((h) => h.date === dateStr)) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      continue;
    }

    const businessStartMinutes = schedule.startHour * 60 + schedule.startMinute;
    const businessEndMinutes = schedule.endHour * 60 + schedule.endMinute;
    const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

    if (currentMinutes < businessStartMinutes) {
      currentDate.setHours(schedule.startHour, schedule.startMinute, 0, 0);
    }

    const availableMinutesToday =
      businessEndMinutes - Math.max(currentMinutes, businessStartMinutes);

    if (availableMinutesToday <= 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
      continue;
    }

    if (remainingMinutes <= availableMinutesToday) {
      currentDate.setMinutes(currentDate.getMinutes() + remainingMinutes);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableMinutesToday;
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }
  }

  return currentDate;
}

export async function closeSlaCheckQueue(): Promise<void> {
  await slaCheckQueue.close();
}

export { Worker, Job, Queue };
