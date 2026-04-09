import { Worker, Job, Queue } from "bullmq";
import { eq, and, lte } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { gdprRequests } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";

const GDPR_SLACK_CHECK_QUEUE = `${env.QUEUE_PREFIX}:gdpr-slack-check`;

export interface GdprSlackCheckJobData {
  type: "check-deadlines" | "send-reminder";
  gdprRequestId?: number;
}

const gdprSlackCheckQueue = new Queue<GdprSlackCheckJobData>(GDPR_SLACK_CHECK_QUEUE, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export async function addGdprSlackCheckJob(
  data: GdprSlackCheckJobData,
  options?: { delay?: number }
): Promise<Job<GdprSlackCheckJobData>> {
  return gdprSlackCheckQueue.add("gdpr-slack-check", data, options);
}

export async function scheduleGdprSlackCheck(
  intervalMinutes: number = 60
): Promise<void> {
  await gdprSlackCheckQueue.add(
    "gdpr-slack-check",
    { type: "check-deadlines" },
    {
      repeat: { every: intervalMinutes * 60 * 1000 },
      jobId: "gdpr-slack-check-recurring",
    }
  );
}

export function createGdprSlackCheckWorker(): Worker {
  return new Worker(
    GDPR_SLACK_CHECK_QUEUE,
    async (job: Job<GdprSlackCheckJobData>) => {
      const { type, gdprRequestId } = job.data;

      switch (type) {
        case "check-deadlines":
          await checkGdprDeadlines();
          break;
        case "send-reminder":
          if (gdprRequestId) await sendGdprReminder(gdprRequestId);
          break;
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    }
  );
}

async function checkGdprDeadlines(): Promise<void> {
  console.log("[GDPR-Slack-Check] Checking GDPR request deadlines");

  const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

  const pendingRequests = await db.query.gdprRequests.findMany({
    where: and(
      eq(gdprRequests.status, "pending"),
      lte(gdprRequests.createdAt, twentyDaysAgo)
    ),
    with: {
      contact: true,
    },
  });

  for (const request of pendingRequests) {
    console.log(`[GDPR-Slack-Check] Sending reminder for request ${request.id}`);
    await sendSlackNotification(request.id, request.contact?.email || "unknown");
  }
}

async function sendGdprReminder(gdprRequestId: number): Promise<void> {
  console.log(`[GDPR-Slack-Check] Sending reminder for request ${gdprRequestId}`);
}

async function sendSlackNotification(requestId: number, email: string): Promise<void> {
  console.log(`[GDPR-Slack-Check] Slack notification for request ${requestId} (${email})`);
}

export async function closeGdprSlackCheckQueue(): Promise<void> {
  await gdprSlackCheckQueue.close();
}

export { Worker, Job, Queue };
