import { Worker, Job, Queue } from "bullmq";
import { eq, and, isNull, sql } from "drizzle-orm";

import { db } from "@ticket-app/db";
import {
  socialAccounts,
  socialMessages,
  tickets,
  ticketMessages,
  lookups,
} from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";

const SOCIAL_SYNC_QUEUE = `${env.QUEUE_PREFIX}-social-sync`;

export interface SocialSyncJobData {
  socialAccountId: number;
}

export interface SocialMessagePayload {
  platformMessageId: string;
  platformParentMessageId?: string;
  authorPlatformUserId: string;
  authorUsername?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  messageType: string;
  bodyText: string;
  bodyHtml?: string;
  mediaUrls?: string[];
  linkUrls?: string[];
  isSpam?: boolean;
  sentAt: Date;
}

const socialSyncQueue = new Queue(SOCIAL_SYNC_QUEUE, {
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

export async function addSocialSyncJob(socialAccountId: number): Promise<void> {
  await socialSyncQueue.add(
    "sync-account",
    { socialAccountId },
    {
      jobId: `social-sync-${socialAccountId}`,
    },
  );
}

export async function scheduleSocialSyncPoll(intervalMs: number = 180000): Promise<void> {
  await socialSyncQueue.add(
    "poll-all-accounts",
    {},
    {
      repeat: { every: intervalMs },
      jobId: "social-sync-poll-recurring",
    },
  );
}

export function createSocialSyncWorker(): Worker {
  return new Worker(
    SOCIAL_SYNC_QUEUE,
    async (job: Job<SocialSyncJobData>) => {
      const { socialAccountId } = job.data;

      const account = await db.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.id, socialAccountId),
          eq(socialAccounts.isActive, true),
          isNull(socialAccounts.deletedAt),
        ),
      });

      if (!account) {
        return { synced: 0, success: true, skipped: true };
      }

      try {
        if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) <= new Date()) {
          await refreshOAuthToken(account);
        }

        const messages = await pollSocialMessages(account);
        let synced = 0;

        for (const message of messages) {
          try {
            await processSocialMessage(account, message);
            synced++;
          } catch (err) {
            console.error(`Failed to process social message ${message.platformMessageId}:`, err);
          }
        }

        await db
          .update(socialAccounts)
          .set({
            updatedAt: new Date(),
          })
          .where(eq(socialAccounts.id, socialAccountId));

        return { synced, success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Social sync failed for account ${socialAccountId}:`, err);
        throw new Error(`Social sync failed: ${errorMessage}`);
      }
    },
    {
      connection: getRedis(),
      concurrency: 3,
    },
  );
}

async function refreshOAuthToken(account: typeof socialAccounts.$inferSelect): Promise<void> {
  if (!account.refreshTokenEnc) {
    throw new Error("No refresh token available");
  }

  let newAccessToken: string;
  let newRefreshToken: string | undefined;
  let newExpiresAt: Date | undefined;

  switch (account.platform.toLowerCase()) {
    case "facebook":
    case "instagram": {
      const response = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: env.FACEBOOK_APP_ID || "",
          fb_exchange_token: account.refreshTokenEnc,
        }),
      });
      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
      };
      newAccessToken = data.access_token;
      newRefreshToken = data.refresh_token;
      newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
      break;
    }
    case "twitter": {
      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: account.refreshTokenEnc,
          client_id: env.X_CLIENT_ID || "",
          client_secret: env.X_CLIENT_SECRET || "",
        }),
      });
      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };
      newAccessToken = data.access_token;
      newRefreshToken = data.refresh_token;
      newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
      break;
    }
    default:
      throw new Error(`Token refresh not supported for platform: ${account.platform}`);
  }

  await db
    .update(socialAccounts)
    .set({
      accessTokenEnc: newAccessToken,
      refreshTokenEnc: newRefreshToken || account.refreshTokenEnc,
      tokenExpiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(socialAccounts.id, account.id));
}

async function pollSocialMessages(
  account: typeof socialAccounts.$inferSelect,
): Promise<SocialMessagePayload[]> {
  switch (account.platform.toLowerCase()) {
    case "facebook":
    case "instagram":
      return pollFacebookMessages(account);
    case "twitter":
      return pollTwitterMessages(account);
    case "whatsapp":
      return pollWhatsAppMessages(account);
    default:
      console.warn(`Unsupported social platform: ${account.platform}`);
      return [];
  }
}

async function pollFacebookMessages(
  account: typeof socialAccounts.$inferSelect,
): Promise<SocialMessagePayload[]> {
  try {
    const pageId = account.platformAccountId;
    const fields = "messages{from,message,created_time,id,parent_id,attachments,type}";
    const url = `https://graph.facebook.com/v18.0/${pageId}?fields=${fields}&access_token=${account.accessTokenEnc}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const messages: SocialMessagePayload[] = [];

    if (data.messages?.data) {
      for (const msg of data.messages.data) {
        messages.push({
          platformMessageId: msg.id,
          platformParentMessageId: msg.parent_id,
          authorPlatformUserId: msg.from?.id || "",
          authorUsername: msg.from?.username,
          authorName: msg.from?.name,
          messageType: msg.type || "message",
          bodyText: msg.message || "",
          sentAt: new Date(msg.created_time),
        });
      }
    }

    return messages;
  } catch (err) {
    console.error(`Facebook poll error for account ${account.id}:`, err);
    throw err;
  }
}

async function pollTwitterMessages(
  account: typeof socialAccounts.$inferSelect,
): Promise<SocialMessagePayload[]> {
  try {
    const userId = account.platformAccountId;
    const url = `https://api.twitter.com/2/users/${userId}/dm_events`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${account.accessTokenEnc}` },
    });
    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const messages: SocialMessagePayload[] = [];

    if (data.data) {
      for (const event of data.data) {
        if (event.type === "MessageCreate") {
          const msg = event.message_create;
          messages.push({
            platformMessageId: event.id,
            authorPlatformUserId: msg.sender_id,
            messageType: "dm",
            bodyText: msg.text || "",
            sentAt: new Date(event.created_at),
          });
        }
      }
    }

    return messages;
  } catch (err) {
    console.error(`Twitter poll error for account ${account.id}:`, err);
    throw err;
  }
}

async function pollWhatsAppMessages(
  account: typeof socialAccounts.$inferSelect,
): Promise<SocialMessagePayload[]> {
  try {
    const phoneNumberId = account.platformAccountId;
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages?access_token=${account.accessTokenEnc}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const messages: SocialMessagePayload[] = [];

    if (data.data) {
      for (const msg of data.data) {
        messages.push({
          platformMessageId: msg.id,
          authorPlatformUserId: msg.from,
          authorUsername: msg.from,
          messageType: msg.type || "text",
          bodyText: msg.text?.body || "",
          sentAt: new Date(msg.timestamp * 1000),
        });
      }
    }

    return messages;
  } catch (err) {
    console.error(`WhatsApp poll error for account ${account.id}:`, err);
    throw err;
  }
}

async function processSocialMessage(
  account: typeof socialAccounts.$inferSelect,
  message: SocialMessagePayload,
): Promise<void> {
  const existingMessage = await db.query.socialMessages.findFirst({
    where: and(
      eq(socialMessages.socialAccountId, account.id),
      eq(socialMessages.platformMessageId, message.platformMessageId),
    ),
  });

  if (existingMessage) {
    return;
  }

  const channelLookup = await db.query.lookups.findFirst({
    where: and(
      eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'channel')`),
      sql`${lookups.metadata}->>'slug' = ${account.platform.toLowerCase()}`,
    ),
  });

  const [socialMessage] = await db
    .insert(socialMessages)
    .values({
      socialAccountId: account.id,
      platform: account.platform,
      platformMessageId: message.platformMessageId,
      platformParentMessageId: message.platformParentMessageId,
      authorPlatformUserId: message.authorPlatformUserId,
      authorUsername: message.authorUsername,
      authorName: message.authorName,
      authorAvatarUrl: message.authorAvatarUrl,
      messageType: message.messageType,
      bodyText: message.bodyText,
      bodyHtml: message.bodyHtml,
      mediaUrls: message.mediaUrls || [],
      linkUrls: message.linkUrls || [],
      isIncoming: true,
      isSpam: message.isSpam || false,
      sentAt: message.sentAt,
    })
    .returning();

  if (!socialMessage) throw new Error("Failed to create social message");

  const settings = {};
  const shouldCreateTicket = (settings as any).autoCreateTicket ?? true;

  if (shouldCreateTicket && !message.isSpam) {
    try {
      const defaultStatusId = (
        await db.query.lookups.findFirst({
          where: and(
            eq(
              lookups.lookupTypeId,
              sql`(SELECT id FROM lookup_types WHERE name = 'ticket_status')`,
            ),
            eq(lookups.isDefault, true),
          ),
        })
      )?.id;

      const defaultPriorityId = (
        await db.query.lookups.findFirst({
          where: and(
            eq(
              lookups.lookupTypeId,
              sql`(SELECT id FROM lookup_types WHERE name = 'ticket_priority')`,
            ),
            eq(lookups.isDefault, true),
          ),
        })
      )?.id;

      const year = new Date().getFullYear();
      const prefix = `TKT-${year}-`;
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(tickets)
        .where(
          sql`${tickets.organizationId} = ${account.organizationId} AND ${tickets.referenceNumber} LIKE ${prefix}%`,
        );
      const sequence = (countResult[0]?.count ?? 0) + 1;
      const referenceNumber = `${prefix}${sequence.toString().padStart(6, "0")}`;

      const [ticket] = await db
        .insert(tickets)
        .values({
          organizationId: account.organizationId,
          referenceNumber,
          subject: `Social: ${message.authorName || message.authorUsername || "Unknown"} - ${message.bodyText.substring(0, 50)}`,
          descriptionHtml: message.bodyHtml || `<p>${message.bodyText}</p>`,
          channelId: channelLookup?.id,
          socialMessageId: socialMessage.id,
          statusId: defaultStatusId!,
          priorityId: defaultPriorityId!,
          isSpam: message.isSpam || false,
        })
        .returning();

      if (!ticket) throw new Error("Failed to create ticket");

      await db
        .update(socialMessages)
        .set({ ticketId: ticket.id })
        .where(eq(socialMessages.id, socialMessage.id));

      await db
        .insert(ticketMessages)
        .values({
          ticketId: ticket.id,
          authorType: "contact",
          messageType: "social",
          bodyHtml: message.bodyHtml || `<p>${message.bodyText}</p>`,
          bodyText: message.bodyText,
        })
        .returning();
    } catch (err) {
      console.error(
        `Failed to create ticket for social message ${message.platformMessageId}:`,
        err,
      );
    }
  }
}

export async function handleSocialWebhook(
  platform: string,
  payload: Record<string, any>,
): Promise<void> {
  console.log(`Received ${platform} webhook:`, JSON.stringify(payload));

  switch (platform.toLowerCase()) {
    case "facebook":
    case "instagram": {
      const entry = payload.entry?.[0];
      if (entry?.changes) {
        for (const change of entry.changes) {
          if (change.field === "messages") {
            const value = change.value;
            const account = await db.query.socialAccounts.findFirst({
              where: and(
                eq(socialAccounts.platformAccountId, value.recipient?.id || entry.id),
                eq(socialAccounts.platform, platform),
                eq(socialAccounts.isActive, true),
              ),
            });
            if (account) {
              await processSocialMessage(account, {
                platformMessageId: value.message?.mid || `webhook-${Date.now()}`,
                authorPlatformUserId: value.sender?.id,
                authorUsername: value.sender?.username,
                authorName: value.sender?.name,
                messageType: value.message?.type || "message",
                bodyText: value.message?.text || "",
                bodyHtml: value.message?.text ? `<p>${value.message.text}</p>` : undefined,
                sentAt: new Date(),
              });
            }
          }
        }
      }
      break;
    }
    case "twitter": {
      const tweetCreateEvents = payload.tweet_create_events || [];
      for (const tweet of tweetCreateEvents) {
        const account = await db.query.socialAccounts.findFirst({
          where: and(
            eq(socialAccounts.platformAccountId, tweet.user?.id_str),
            eq(socialAccounts.platform, "twitter"),
            eq(socialAccounts.isActive, true),
          ),
        });
        if (account) {
          await processSocialMessage(account, {
            platformMessageId: tweet.id_str,
            authorPlatformUserId: tweet.user?.id_str,
            authorUsername: tweet.user?.screen_name,
            authorName: tweet.user?.name,
            messageType: "tweet",
            bodyText: tweet.text || "",
            sentAt: new Date(tweet.created_at),
          });
        }
      }
      break;
    }
    default:
      console.warn(`Webhook handler not implemented for platform: ${platform}`);
  }
}

export async function updateSocialMessageStatus(
  platformMessageId: string,
  platform: string,
  status: "read" | "replied",
): Promise<void> {
  const message = await db.query.socialMessages.findFirst({
    where: and(
      eq(socialMessages.platformMessageId, platformMessageId),
      eq(socialMessages.platform, platform),
    ),
  });

  if (message) {
    console.log(`Social message ${platformMessageId} marked as ${status}`);
  }
}

export async function closeSocialSyncQueue(): Promise<void> {
  await socialSyncQueue.close();
}

export { Worker, Job, Queue };
