import { Queue, Worker, Job } from "bullmq";
import { eq, and, sql } from "drizzle-orm";

import { env } from "@ticket-app/env/server";
import { db } from "@ticket-app/db";
import { organizations } from "@ticket-app/db/schema/_organizations";
import { subscriptions, usageSnapshots, seats } from "@ticket-app/db/schema/_billing";
import { contacts } from "@ticket-app/db/schema/_contacts";
import { tickets } from "@ticket-app/db/schema/_tickets";
import { addNotificationJob, addUsageCheckJob } from "@ticket-app/db/lib/queues";

export const USAGE_CHECK_QUEUE = "billing-usage-check";

const connection = {
  host: env.REDIS_URL.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(env.REDIS_URL.split(":")[2] || "6379"),
};

export type UsageCheckJobData = {
  organizationId?: number;
};

export const usageCheckQueue = new Queue<UsageCheckJobData>(USAGE_CHECK_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

interface OrganizationUsage {
  organizationId: number;
  agentCount: number;
  contactCount: number;
  ticketCount: number;
  storageUsedMb: number;
  maxAgents: number;
  maxContacts: number;
}

async function getOrganizationUsage(orgId: number): Promise<OrganizationUsage> {
  const activeSeats = await db
    .select({ count: sql<number>`count(*)` })
    .from(seats)
    .innerJoin(subscriptions, eq(seats.subscriptionId, subscriptions.id))
    .where(and(eq(subscriptions.organizationId, orgId), sql`${seats.removedAt} IS NULL`));

  const contactCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(contacts)
    .where(eq(contacts.organizationId, orgId));

  const ticketCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(eq(tickets.organizationId, orgId));

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    with: {
      subscription: {
        with: {
          plan: true,
        },
      },
    },
  });

  return {
    organizationId: orgId,
    agentCount: Number(activeSeats[0]?.count || 0),
    contactCount: Number(contactCount[0]?.count || 0),
    ticketCount: Number(ticketCount[0]?.count || 0),
    storageUsedMb: 0,
    maxAgents: org?.subscription?.plan?.maxAgents || 0,
    maxContacts: org?.subscription?.plan?.maxContacts || 0,
  };
}

async function recordUsageSnapshot(usage: OrganizationUsage): Promise<void> {
  await db.insert(usageSnapshots).values({
    organizationId: usage.organizationId,
    snapshotDate: new Date(),
    agentCount: usage.agentCount,
    contactCount: usage.contactCount,
    ticketCount: usage.ticketCount,
    storageUsedMb: usage.storageUsedMb,
  });
}

type UsageLimitType = "agents" | "contacts";

async function checkUsageLimit(
  usage: OrganizationUsage,
  limitType: UsageLimitType,
): Promise<{
  current: number;
  limit: number;
  percentage: number;
  isOverLimit: boolean;
  isWarning: boolean;
}> {
  const current = limitType === "agents" ? usage.agentCount : usage.contactCount;
  const limit = limitType === "agents" ? usage.maxAgents : usage.maxContacts;

  if (limit === 0) {
    return { current, limit, percentage: 0, isOverLimit: false, isWarning: false };
  }

  const percentage = (current / limit) * 100;

  return {
    current,
    limit,
    percentage: Math.round(percentage * 100) / 100,
    isOverLimit: current > limit,
    isWarning: percentage >= 80 && percentage < 100,
  };
}

async function sendUsageWarning(
  orgId: number,
  limitType: UsageLimitType,
  current: number,
  limit: number,
  percentage: number,
): Promise<void> {
  const message =
    limitType === "agents"
      ? `Agent limit warning: You are using ${current} of ${limit} agents (${percentage}%). Consider upgrading your plan.`
      : `Contact limit warning: You are using ${current} of ${limit} contacts (${percentage}%). Consider upgrading your plan.`;

  await addNotificationJob({
    userId: `org-${orgId}`,
    type: "usage_warning",
    title: `${limitType === "agents" ? "Agent" : "Contact"} Limit Warning`,
    message,
    metadata: {
      organizationId: orgId,
      limitType,
      current,
      limit,
      percentage,
    },
  });
}

async function sendUsageBlocked(
  orgId: number,
  limitType: UsageLimitType,
  current: number,
  limit: number,
): Promise<void> {
  const message =
    limitType === "agents"
      ? `Agent limit reached: You have ${current} agents and your plan limits you to ${limit}. Please upgrade or remove agents to continue.`
      : `Contact limit reached: You have ${current} contacts and your plan limits you to ${limit}. Please upgrade or remove contacts to continue.`;

  await addNotificationJob({
    userId: `org-${orgId}`,
    type: "usage_blocked",
    title: `${limitType === "agents" ? "Agent" : "Contact"} Limit Reached`,
    message,
    metadata: {
      organizationId: orgId,
      limitType,
      current,
      limit,
    },
  });
}

export async function checkOrganizationUsage(orgId: number): Promise<{
  agents: {
    current: number;
    limit: number;
    percentage: number;
    isOverLimit: boolean;
    isWarning: boolean;
  };
  contacts: {
    current: number;
    limit: number;
    percentage: number;
    isOverLimit: boolean;
    isWarning: boolean;
  };
}> {
  const usage = await getOrganizationUsage(orgId);

  await recordUsageSnapshot(usage);

  const agentsCheck = await checkUsageLimit(usage, "agents");
  const contactsCheck = await checkUsageLimit(usage, "contacts");

  if (agentsCheck.isOverLimit) {
    await sendUsageBlocked(orgId, "agents", agentsCheck.current, agentsCheck.limit);
  } else if (agentsCheck.isWarning) {
    await sendUsageWarning(
      orgId,
      "agents",
      agentsCheck.current,
      agentsCheck.limit,
      agentsCheck.percentage,
    );
  }

  if (contactsCheck.isOverLimit) {
    await sendUsageBlocked(orgId, "contacts", contactsCheck.current, contactsCheck.limit);
  } else if (contactsCheck.isWarning) {
    await sendUsageWarning(
      orgId,
      "contacts",
      contactsCheck.current,
      contactsCheck.limit,
      contactsCheck.percentage,
    );
  }

  return {
    agents: agentsCheck,
    contacts: contactsCheck,
  };
}

export async function isActionAllowed(
  orgId: number,
  actionType: "add_agent" | "add_contact",
): Promise<boolean> {
  const usage = await getOrganizationUsage(orgId);

  if (actionType === "add_agent") {
    const check = await checkUsageLimit(usage, "agents");
    return !check.isOverLimit;
  }

  if (actionType === "add_contact") {
    const check = await checkUsageLimit(usage, "contacts");
    return !check.isOverLimit;
  }

  return true;
}

export function createUsageCheckWorker() {
  return new Worker<UsageCheckJobData>(
    USAGE_CHECK_QUEUE,
    async (job) => {
      const { organizationId } = job.data;

      if (organizationId) {
        await checkOrganizationUsage(organizationId);
      } else {
        const allOrgs = await db.query.organizations.findMany({
          where: eq(organizations.isActive, true),
        });

        for (const org of allOrgs) {
          await checkOrganizationUsage(org.id);
        }
      }
    },
    {
      connection,
      concurrency: 3,
    },
  );
}

export async function scheduleUsageChecks(): Promise<void> {
  await usageCheckQueue.add(
    "usage_check",
    {},
    {
      jobId: `usage-check-${Date.now()}`,
      repeat: {
        pattern: "0 0 * * *",
      },
    },
  );
}

export async function scheduleOrgUsageCheck(orgId: number): Promise<void> {
  await addUsageCheckJob({ organizationId: orgId });
}

export { Job };
