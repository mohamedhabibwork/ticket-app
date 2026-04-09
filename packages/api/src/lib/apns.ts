import { db } from "@ticket-app/db";
import { mobileSdkConfigs, contactPushTokens, pushNotificationLogs } from "@ticket-app/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const APNS_URL = "https://api.push.apple.com/3/device/";

export interface APNsMessage {
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

export interface APNsSendResult {
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

  if (!config || !config.apnsKeyId || !config.apnsTeamId || !config.apnsKey || !config.apnsBundleId) {
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
  privateKeyBase64: string
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
    })
  ).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: teamId,
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const signatureInput = `${header}.${payload}`;
  const sign = crypto.createSign("ES256");
  sign.update(signatureInput);
  const signature = sign.sign(privateKey).toString("base64url");

  return `${signatureInput}.${signature}`;
}

export async function sendAPNsNotification(
  organizationId: number,
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  badge?: number
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
        "authorization": `bearer ${authToken}`,
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

export async function sendAPNsBatch(
  organizationId: number,
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
  const results = { successCount: 0, failureCount: 0, errors: [] as string[] };

  for (const token of tokens) {
    const result = await sendAPNsNotification(organizationId, token, title, body, data);
    if (result.success) {
      results.successCount++;
    } else {
      results.failureCount++;
      if (result.error) results.errors.push(result.error);
    }
  }

  return results;
}
