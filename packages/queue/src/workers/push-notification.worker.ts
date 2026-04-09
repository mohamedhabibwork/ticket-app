import { Worker, Job, Queue } from "bullmq";
import { eq } from "drizzle-orm";
import crypto from "crypto";

import { db } from "@ticket-app/db";
import {
  contactPushTokens,
  pushNotificationLogs,
  contacts,
  mobileSdkConfigs,
} from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";
const FCM_API_URL = "https://fcm.googleapis.com/fcm/send";

const APNS_URL = "https://api.push.apple.com/3/device/";

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
  options?: { delay?: number },
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
    },
  );
}

async function sendPushNotification(
  contactId: number,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  ticketId?: number,
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
  ticketId?: number,
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
  ticketId?: number,
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

interface FCMMessage {
  to?: string;
  token?: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

interface FCMSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function getFCMConfig(organizationId: number): Promise<{ serverKey: string } | null> {
  const config = await db.query.mobileSdkConfigs.findFirst({
    where: eq(mobileSdkConfigs.organizationId, organizationId),
  });

  if (!config || !config.fcmServerKey) {
    return null;
  }

  return { serverKey: config.fcmServerKey };
}

async function sendFCMNotification(
  organizationId: number,
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<FCMSendResult> {
  const config = await getFCMConfig(organizationId);

  if (!config) {
    return { success: false, error: "FCM not configured for organization" };
  }

  const message: FCMMessage = {
    token,
    notification: { title, body },
    data: data as Record<string, string>,
  };

  try {
    const response = await fetch(FCM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${config.serverKey}`,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `FCM API error: ${response.status} - ${errorText}` };
    }

    const result = (await response.json()) as {
      success: number;
      failure: number;
      results?: Array<{ error?: string }>;
    };

    if (result.success === 1) {
      return { success: true, messageId: result.results?.[0] ? "message_sent" : undefined };
    } else {
      return { success: false, error: result.results?.[0]?.error || "Unknown FCM error" };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

interface APNsMessage {
  token: string;
  payload: {
    aps: {
      alert: {
        title: string;
        body: string;
      };
      badge?: number;
      sound?: string;
    };
    data?: Record<string, string>;
  };
}

interface APNsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/[-_]/g, (c) => (c === "-" ? "+" : "/")));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getAPNsConfig(organizationId: number): Promise<{
  keyId: string;
  teamId: string;
  privateKey: string;
  bundleId: string;
} | null> {
  const config = await db.query.mobileSdkConfigs.findFirst({
    where: eq(mobileSdkConfigs.organizationId, organizationId),
  });

  if (
    !config ||
    !config.apnsKeyId ||
    !config.apnsTeamId ||
    !config.apnsKey ||
    !config.apnsBundleId
  ) {
    return null;
  }

  return {
    keyId: config.apnsKeyId,
    teamId: config.apnsTeamId,
    privateKey: config.apnsKey,
    bundleId: config.apnsBundleId,
  };
}

async function generateAPNsToken(
  keyId: string,
  teamId: string,
  privateKeyBase64: string,
): Promise<string> {
  const privateKeyBytes = base64ToArrayBuffer(privateKeyBase64);
  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(privateKeyBytes),
    format: "der",
    type: "pkcs8",
  });

  const header = Buffer.from(
    JSON.stringify({
      alg: "ES256",
      kid: keyId,
      typ: "JWT",
    }),
  ).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: teamId,
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");

  const signatureInput = `${header}.${payload}`;
  const sign = crypto.createSign("ES256");
  sign.update(signatureInput);
  const signature = sign.sign(privateKey).toString("base64url");

  return `${signatureInput}.${signature}`;
}

async function sendAPNsNotification(
  organizationId: number,
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  badge?: number,
): Promise<APNsSendResult> {
  const config = await getAPNsConfig(organizationId);

  if (!config) {
    return { success: false, error: "APNs not configured for organization" };
  }

  try {
    const authToken = await generateAPNsToken(config.keyId, config.teamId, config.privateKey);

    const payload: APNsMessage = {
      token,
      payload: {
        aps: {
          alert: { title, body },
          badge,
          sound: "default",
        },
        data: data as Record<string, string>,
      },
    };

    const response = await fetch(`${APNS_URL}${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apns-topic": config.bundleId,
        "apns-push-type": "alert",
        authorization: `bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `APNs error: ${response.status} - ${errorText}` };
    }

    const messageId = response.headers.get("apns-id");
    return { success: true, messageId: messageId || undefined };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

export async function closePushNotificationQueue(): Promise<void> {
  await pushNotificationQueue.close();
}

export { Worker, Job, Queue };
