import { Worker, Job, Queue } from "bullmq";
import { eq } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { contactPushTokens, pushNotificationLogs, contacts } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";
import { sendFCMNotification } from "@ticket-app/api/src/lib/fcm";
import { sendAPNsNotification } from "@ticket-app/api/src/lib/apns";

const PUSH_NOTIFICATION_QUEUE = `${env.QUEUE_PREFIX}:push-notification`;

export interface PushNotificationJobData {
  type: "send" | "send-batch";
  contactId?: number;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  ticketId?: number;
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
      const { type, contactId, title, body, data, ticketId, tokenIds } = job.data;

      switch (type) {
        case "send":
          if (contactId) await sendPushNotification(contactId, title, body, data, ticketId);
          break;
        case "send-batch":
          if (tokenIds) await sendBatchPushNotifications(tokenIds, title, body, data, ticketId);
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
  data?: Record<string, unknown>,
  ticketId?: number
): Promise<void> {
  console.log(`[Push-Notification] Sending notification to contact ${contactId}`);

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact) {
    console.error(`[Push-Notification] Contact ${contactId} not found`);
    return;
  }

  const tokens = await db.query.contactPushTokens.findMany({
    where: eq(contactPushTokens.contactId, contactId),
  });

  for (const token of tokens) {
    if (!token.isActive) continue;

    try {
      await deliverPushNotification(contact.organizationId, token, title, body, data, ticketId);
    } catch (error) {
      console.error(`[Push-Notification] Failed to send to token ${token.id}:`, error);
    }
  }
}

async function sendBatchPushNotifications(
  tokenIds: number[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  ticketId?: number
): Promise<void> {
  console.log(`[Push-Notification] Sending batch notification to ${tokenIds.length} tokens`);

  for (const tokenId of tokenIds) {
    const token = await db.query.contactPushTokens.findFirst({
      where: eq(contactPushTokens.id, tokenId),
    });

    if (!token || !token.isActive) continue;

    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, token.contactId),
    });

    if (!contact) continue;

    try {
      await deliverPushNotification(contact.organizationId, token, title, body, data, ticketId);
    } catch (error) {
      console.error(`[Push-Notification] Failed to send to token ${token.id}:`, error);
    }
  }
}

async function deliverPushNotification(
  organizationId: number,
  token: typeof contactPushTokens.$inferSelect,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  ticketId?: number
): Promise<void> {
  console.log(`[Push-Notification] Delivering to token ${token.id} (${token.platform})`);

  let result;
  if (token.platform === "android") {
    result = await sendFCMNotification(organizationId, token.token, title, body, data);
  } else {
    result = await sendAPNsNotification(organizationId, token.token, title, body, data);
  }

  await db.insert(pushNotificationLogs).values({
    contactId: token.contactId,
    pushTokenId: token.id,
    ticketId: ticketId || null,
    title,
    body,
    data: data as any,
    status: result.success ? "sent" : "failed",
    errorMessage: result.error,
    sentAt: new Date(),
  });

  if (!result.success && result.error) {
    console.error(`[Push-Notification] Delivery failed: ${result.error}`);
  }
}

export async function closePushNotificationQueue(): Promise<void> {
  await pushNotificationQueue.close();
}

export { Worker, Job, Queue };
