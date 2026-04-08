import { db } from "@ticket-app/db";
import { socialAccounts } from "@ticket-app/db/schema";
import { encryptToken, decryptToken } from "../../lib/crypto";

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

export interface WhatsAppConfig {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
}

export interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  account_status: string;
}

export interface WhatsAppPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
}

export interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    link: string;
    caption?: string;
  };
}

let whatsappConfig: WhatsAppConfig | null = null;

export function setWhatsAppConfig(config: WhatsAppConfig): void {
  whatsappConfig = config;
}

function getWhatsAppConfig(): WhatsAppConfig {
  if (!whatsappConfig) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const wabaId = process.env.WHATSAPP_WABA_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !wabaId || !accessToken) {
      throw new Error("WhatsApp Business credentials not configured");
    }

    whatsappConfig = { phoneNumberId, wabaId, accessToken };
  }
  return whatsappConfig;
}

export async function getWhatsAppBusinessAccounts(accessToken: string): Promise<WhatsAppBusinessAccount[]> {
  const response = await fetch(
    `${WHATSAPP_API_URL}/me/businesses?access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get WhatsApp business accounts: ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function getWhatsAppPhoneNumbers(
  wabaId: string,
  accessToken: string
): Promise<WhatsAppPhoneNumber[]> {
  const response = await fetch(
    `${WHATSAPP_API_URL}/${wabaId}/phone_numbers?access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get WhatsApp phone numbers: ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function getWhatsAppTemplates(
  wabaId: string,
  accessToken: string
): Promise<WhatsAppTemplate[]> {
  const response = await fetch(
    `${WHATSAPP_API_URL}/${wabaId}/message_templates?access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get WhatsApp templates: ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function sendWhatsAppMessage(
  to: string,
  message: string,
  phoneNumberId?: string
): Promise<{ messages: Array<{ id: string }> }> {
  const config = getWhatsAppConfig();
  const from = phoneNumberId || config.phoneNumberId;

  const payload: WhatsAppMessage = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body: message,
    },
  };

  const response = await fetch(
    `${WHATSAPP_API_URL}/${from}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send WhatsApp message: ${error}`);
  }

  return response.json();
}

export async function sendWhatsAppImageMessage(
  to: string,
  imageUrl: string,
  caption?: string,
  phoneNumberId?: string
): Promise<{ messages: Array<{ id: string }> }> {
  const config = getWhatsAppConfig();
  const from = phoneNumberId || config.phoneNumberId;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: {
      link: imageUrl,
      caption,
    },
  };

  const response = await fetch(
    `${WHATSAPP_API_URL}/${from}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send WhatsApp image message: ${error}`);
  }

  return response.json();
}

export async function markWhatsAppMessageAsRead(messageId: string, phoneNumberId?: string): Promise<void> {
  const config = getWhatsAppConfig();
  const from = phoneNumberId || config.phoneNumberId;

  const payload = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  };

  const response = await fetch(
    `${WHATSAPP_API_URL}/${from}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to mark WhatsApp message as read: ${error}`);
  }
}

export async function getWhatsAppIncomingMessages(
  phoneNumberId?: string,
  limit: number = 25
): Promise<any[]> {
  const config = getWhatsAppConfig();
  const from = phoneNumberId || config.phoneNumberId;

  const response = await fetch(
    `${WHATSAPP_API_URL}/${from}/messages?` + new URLSearchParams({
      fields: "id,timestamp,type,from,text,image,audio,video,document,location",
      limit: String(limit),
    }),
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get WhatsApp incoming messages: ${error}`);
  }

  const data = await response.json();
  return (data.data || []).filter((msg: any) => msg.from !== undefined);
}

export async function connectWhatsAppAccount(
  organizationId: number,
  userId: number | undefined,
  phoneNumber: WhatsAppPhoneNumber,
  accessToken: string
): Promise<number> {
  const encryptedAccessToken = encryptToken(accessToken);
  const encryptedRefreshToken = encryptToken(accessToken);

  const expiresAt = new Date(Date.now() + 5184000 * 1000);

  const [account] = await db
    .insert(socialAccounts)
    .values({
      organizationId,
      userId,
      platform: "whatsapp",
      platformAccountId: phoneNumber.id,
      platformUsername: phoneNumber.display_phone_number,
      accessTokenEnc: encryptedAccessToken,
      refreshTokenEnc: encryptedRefreshToken,
      tokenExpiresAt: expiresAt,
      createdBy: userId,
      updatedBy: userId,
    })
    .onConflictDoUpdate({
      target: [socialAccounts.organizationId, socialAccounts.platform, socialAccounts.platformAccountId],
      set: {
        accessTokenEnc: encryptedAccessToken,
        refreshTokenEnc: encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
        platformUsername: phoneNumber.display_phone_number,
        isActive: true,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    })
    .returning();

  return account.id;
}

export async function getWhatsAppWebhookPayload(
  payload: any
): Promise<{
  waId: string;
  messageType: string;
  text?: string;
  timestamp: string;
  messageId?: string;
  mediaUrl?: string;
}> | null {
  if (!payload.entry?.length) return null;

  const changes = payload.entry[0]?.changes?.[0]?.value;
  if (!changes) return null;

  const messages = changes.messages;
  if (!messages?.length) return null;

  const message = messages[0];
  const messageType = message.type;

  const result: any = {
    waId: message.from,
    messageType,
    timestamp: message.timestamp,
    messageId: message.id,
  };

  if (messageType === "text") {
    result.text = message.text?.body;
  } else if (messageType === "image") {
    result.mediaUrl = message.image?.id;
  }

  return result;
}

export function validateWhatsAppWebhook(
  payload: any,
  mode: string,
  verifyToken?: string
): { challenge: string | null; valid: boolean } {
  if (mode === "subscribe" && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
    return { challenge: payload["hub.challenge"], valid: true };
  }

  return { challenge: null, valid: false };
}

export async function downloadWhatsAppMedia(
  mediaId: string,
  accessToken?: string
): Promise<Buffer> {
  const config = getWhatsAppConfig();
  const token = accessToken || config.accessToken;

  const response = await fetch(
    `${WHATSAPP_API_URL}/${mediaId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get WhatsApp media URL: ${await response.text()}`);
  }

  const mediaData = await response.json();
  
  const mediaResponse = await fetch(mediaData.url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!mediaResponse.ok) {
    throw new Error(`Failed to download WhatsApp media`);
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
