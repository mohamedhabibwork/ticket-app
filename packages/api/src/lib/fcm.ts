import { db } from "@ticket-app/db";
import { mobileSdkConfigs, pushNotificationLogs } from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";

const FCM_API_URL = "https://fcm.googleapis.com/fcm/send";

export interface FCMMessage {
  to?: string;
  token?: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

export interface FCMSendResult {
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

export async function sendFCMNotification(
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

export async function sendFCMBatch(
  organizationId: number,
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
  const results = { successCount: 0, failureCount: 0, errors: [] as string[] };

  for (const token of tokens) {
    const result = await sendFCMNotification(organizationId, token, title, body, data);
    if (result.success) {
      results.successCount++;
    } else {
      results.failureCount++;
      if (result.error) results.errors.push(result.error);
    }
  }

  return results;
}

export async function logPushNotification(
  contactId: number,
  tokenId: number | null,
  ticketId: number | null,
  title: string,
  body: string,
  status: "sent" | "delivered" | "failed" | "opened",
  errorMessage?: string,
): Promise<void> {
  await db.insert(pushNotificationLogs).values({
    contactId,
    pushTokenId: tokenId,
    ticketId,
    title,
    body,
    status,
    errorMessage,
    sentAt: new Date(),
  });
}
