import { Queue, Worker, Job } from "bullmq";
import { eq } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { ticketSla } from "@ticket-app/db/schema/_sla";
import { addNotificationJob } from "@ticket-app/db/lib/queues";
import { addSlaEscalationJob, getEscalationLevel } from "./slaEscalation";

export const SLA_BREACH_CHECK_QUEUE = "sla-breach-check";

export type SlaBreachJobData = {
  ticketId: number;
  checkType: "first_response" | "resolution";
};

const connection = {
  host: process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(process.env.REDIS_URL?.split(":")[2] || "6379"),
};

export const slaBreachCheckQueue = new Queue<SlaBreachJobData>(SLA_BREACH_CHECK_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export async function addSlaBreachCheckJob(
  ticketId: number,
  checkType: "first_response" | "resolution",
): Promise<Job<SlaBreachJobData>> {
  return slaBreachCheckQueue.add(
    "breach-check",
    { ticketId, checkType },
    {
      jobId: `sla-breach-${ticketId}-${checkType}-${Date.now()}`,
    },
  );
}

export function createSlaBreachWorker() {
  return new Worker<SlaBreachJobData>(
    SLA_BREACH_CHECK_QUEUE,
    async (job) => {
      const { ticketId, checkType } = job.data;

      const sla = await db.query.ticketSla.findFirst({
        where: eq(ticketSla.ticketId, ticketId),
        with: {
          slaPolicy: {
            with: {
              targets: true,
            },
          },
          ticket: true,
        },
      });

      if (!sla || sla.pausedAt) {
        return;
      }

      const now = new Date();

      if (checkType === "first_response" && !sla.firstResponseBreached) {
        if (sla.firstResponseDueAt < now) {
          await db
            .update(ticketSla)
            .set({
              firstResponseBreached: true,
              firstResponseBreachedAt: now,
              updatedAt: now,
            })
            .where(eq(ticketSla.id, sla.id));

          await executeEscalation(sla, "first_response");
        }
      }

      if (checkType === "resolution" && !sla.resolutionBreached) {
        if (sla.resolutionDueAt < now) {
          await db
            .update(ticketSla)
            .set({
              resolutionBreached: true,
              resolutionBreachedAt: now,
              updatedAt: now,
            })
            .where(eq(ticketSla.id, sla.id));

          await executeEscalation(sla, "resolution");
        }
      }
    },
    {
      connection,
      concurrency: 5,
    },
  );
}

interface SlaWithRelations {
  id: number;
  ticketId: number;
  slaPolicyId: number;
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  firstResponseBreachedAt: Date | null;
  resolutionBreachedAt: Date | null;
  pausedAt: Date | null;
  pausedDurationMinutes: number;
  slaPolicy?: {
    id: number;
    targets: Array<{
      id: number;
      escalateAgentId: number | null;
      escalateTeamId: number | null;
    }>;
  };
  ticket?: {
    id: number;
    referenceNumber: string;
  };
}

async function executeEscalation(
  sla: SlaWithRelations,
  breachType: "first_response" | "resolution",
) {
  if (!sla.ticket) return;

  const target = sla.slaPolicy?.targets?.[0];
  if (!target) return;

  const escalationLevel = (await getEscalationLevel(sla.ticketId)) + 1;

  if (target.escalateAgentId || target.escalateTeamId) {
    await addSlaEscalationJob(sla.ticketId, breachType, target.id, escalationLevel);
  } else {
    if (target.escalateAgentId) {
      await addNotificationJob({
        userId: target.escalateAgentId.toString(),
        type: "sla_breach",
        title: `SLA Breach: ${breachType === "first_response" ? "First Response" : "Resolution"}`,
        message: `Ticket #${sla.ticket.referenceNumber} has breached the SLA for ${breachType === "first_response" ? "first response" : "resolution"} time.`,
        metadata: {
          ticketId: sla.ticketId,
          breachType,
          slaPolicyId: sla.slaPolicyId,
        },
      });
    }

    if (target.escalateTeamId) {
      await addNotificationJob({
        userId: `team-${target.escalateTeamId}`,
        type: "sla_breach",
        title: `SLA Breach: ${breachType === "first_response" ? "First Response" : "Resolution"}`,
        message: `Ticket #${sla.ticket.referenceNumber} has breached the SLA for ${breachType === "first_response" ? "first response" : "resolution"} time.`,
        metadata: {
          ticketId: sla.ticketId,
          breachType,
          slaPolicyId: sla.slaPolicyId,
          teamId: target.escalateTeamId,
        },
      });
    }
  }
}

export async function scheduleBreachChecks(ticketId: number): Promise<void> {
  const sla = await db.query.ticketSla.findFirst({
    where: eq(ticketSla.ticketId, ticketId),
  });

  if (!sla) return;

  const delayFirstResponse = Math.max(0, sla.firstResponseDueAt.getTime() - Date.now());
  const delayResolution = Math.max(0, sla.resolutionDueAt.getTime() - Date.now());

  if (!sla.firstResponseBreached && delayFirstResponse > 0) {
    await slaBreachCheckQueue.add(
      "breach-check",
      { ticketId, checkType: "first_response" },
      {
        jobId: `sla-breach-${ticketId}-first_response`,
        delay: delayFirstResponse,
      },
    );
  }

  if (!sla.resolutionBreached && delayResolution > 0) {
    await slaBreachCheckQueue.add(
      "breach-check",
      { ticketId, checkType: "resolution" },
      {
        jobId: `sla-breach-${ticketId}-resolution`,
        delay: delayResolution,
      },
    );
  }
}

export { Worker, Job };
