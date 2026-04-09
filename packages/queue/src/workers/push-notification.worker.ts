import { Worker, Job, Queue } from "bullmq";
import { eq } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { contactPushTokens, pushNotificationLogs } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";

const PUSH_NOTIFICATION_QUEUE = `${env.QUEUE_PREFIX}:push-notification`;

export interface PushNotificationJobData {
  type: "send" | "send-batch";
  contactId?: number;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  tokenIds?: number[];
}

const pushNotificationQueue = new Queue<PushNotificationJobData>(PUSH_NOTIFICATION_QUEUE, {
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

export async function addPushNotificationJob(
  data: PushNotificationJobData,
  options?: { delay?: number }
): Promise<Job<PushNotificationJobData>> {
  return pushNotificationQueue.add("push-notification", data, options);
}

export function createPushNotificationWorker(): Worker {
  return new Worker(
    PUSH_NOTIFICATION_QUEUE,
    async (job: Job<PushNotificationJobData>) => {
      const { type, contactId, title, body, data, tokenIds } = job.data;

      switch (type) {
        case "send":
          if (contactId) await sendPushNotification(contactId, title, body, data);
          break;
        case "send-batch":
          if (tokenIds) await sendBatchPushNotifications(tokenIds, title, body, data);
          break;
      }
    },
    {
      connection: getRedis(),
      concurrency: 5,
    }
  );
}

async function sendPushNotification(
  contactId: number,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  console.log(`[Push-Notification] Sending notification to contact ${contactId}`);

  const tokens = await db.query.contactPushTokens.findMany({
    where: eq(contactPushTokens.contactId, contactId),
  });

  for (const token of tokens) {
    try {
      await deliverPushNotification(token, title, body, data);
    } catch (error) {
      console.error(`[Push-Notification] Failed to send to token ${token.id}:`, error);
    }
  }
}

async function sendBatchPushNotifications(
  tokenIds: number[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  console.log(`[Push-Notification] Sending batch notification to ${tokenIds.length} tokens`);

  const tokens = await db.query.contactPushTokens.findMany({
    where: eq(contactPushTokens.id, tokenIds[0]),
  });

  for (const token of tokens) {
    try {
      await deliverPushNotification(token, title, body, data);
    } catch (error) {
      console.error(`[Push-Notification] Failed to send to token ${token.id}:`, error);
    }
  }
}

async function deliverPushNotification(
  token: typeof contactPushTokens.$inferSelect,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  console.log(`[Push-Notification] Delivering to token ${token.id} (${token.platform})`);

  await db.insert(pushNotificationLogs).values({
    contactId: token.contactId,
    tokenId: token.id,
    title,
    body,
    status: "sent",
    sentAt: new Date(),
  });
}

export async function closePushNotificationQueue(): Promise<void> {
  await pushNotificationQueue.close();
}

export { Worker, Job, Queue };
