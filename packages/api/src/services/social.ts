import { db } from "@ticket-app/db";
import {
  socialAccounts,
  socialMessages,
  tickets,
  ticketMessages,
  contacts,
  lookups,
} from "@ticket-app/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { generateReferenceNumber } from "../lib/reference";

import { decryptToken } from "../lib/crypto";
import {
  getFacebookConversationMessages,
  sendFacebookMessage,
  getFacebookUser,
} from "./social/facebook";
import {
  getTwitterDmEvents,
  getTwitterConversationMessages,
  sendTwitterDm,
  getTwitterUser,
} from "./social/twitter";
import {
  sendWhatsAppMessage,
  getWhatsAppIncomingMessages,
  markWhatsAppMessageAsRead,
} from "./social/whatsapp";

export interface SocialMessageInput {
  platform: "facebook" | "instagram" | "twitter" | "whatsapp";
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
  isIncoming: boolean;
  sentAt?: Date;
}

export async function getAccountWithToken(accountId: number): Promise<{
  account: any;
  accessToken: string;
  refreshToken: string | null;
} | null> {
  const account = await db.query.socialAccounts.findFirst({
    where: and(
      eq(socialAccounts.id, accountId),
      eq(socialAccounts.isActive, true),
      isNull(socialAccounts.deletedAt)
    ),
  });

  if (!account) return null;

  const accessToken = decryptToken(account.accessTokenEnc);
  const refreshToken = account.refreshTokenEnc
    ? decryptToken(account.refreshTokenEnc)
    : null;

  return { account, accessToken, refreshToken };
}

export async function findOrCreateContact(
  organizationId: number,
  platformUserId: string,
  username?: string,
  name?: string,
  avatarUrl?: string
): Promise<any> {
  const authorIdentifier = `${platformUserId}`;

  let contact = await db.query.contacts.findFirst({
    where: and(
      sql`${contacts.metadata}->>'socialPlatformUserId' = ${authorIdentifier}`,
      eq(contacts.organizationId, organizationId),
      isNull(contacts.deletedAt)
    ),
  });

  if (!contact) {
    const [newContact] = await db
      .insert(contacts)
      .values({
        organizationId,
        firstName: name?.split(" ")[0] || username || "Social",
        lastName: name?.split(" ").slice(1).join(" ") || "",
        metadata: {
          socialPlatformUserId: platformUserId,
          socialUsername: username,
          socialAvatarUrl: avatarUrl,
        },
      })
      .returning();
    contact = newContact;
  }

  return contact;
}

export async function getSocialChannelLookup(organizationId: number): Promise<number | null> {
  const channelLookup = await db.query.lookups.findFirst({
    where: and(
      eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'channel')`),
      sql`${lookups.metadata}->>'slug' = 'social'`
    ),
  });

  return channelLookup?.id || null;
}

export async function createTicketFromSocialMessage(
  organizationId: number,
  socialMessageId: number,
  contactId: number
): Promise<any> {
  const message = await db.query.socialMessages.findFirst({
    where: eq(socialMessages.id, socialMessageId),
  });

  if (!message) return null;

  const channelId = await getSocialChannelLookup(organizationId);
  const referenceNumber = await generateReferenceNumber(organizationId);

  const defaultStatusLookup = await db.query.lookups.findFirst({
    where: and(
      eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'ticket_status')`),
      eq(lookups.isDefault, true)
    ),
  });

  const defaultPriorityLookup = await db.query.lookups.findFirst({
    where: and(
      eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'ticket_priority')`),
      eq(lookups.isDefault, true)
    ),
  });

  const [ticket] = await db
    .insert(tickets)
    .values({
      organizationId,
      referenceNumber,
      subject: `${message.platform.toUpperCase()} Message from ${message.authorName || message.authorUsername || "Unknown"}`,
      descriptionHtml: message.bodyHtml || `<p>${message.bodyText}</p>`,
      descriptionText: message.bodyText,
      statusId: defaultStatusLookup?.id,
      priorityId: defaultPriorityLookup?.id,
      channelId,
      contactId,
      socialMessageId,
    })
    .returning();

  await db
    .update(socialMessages)
    .set({ ticketId: ticket.id })
    .where(eq(socialMessages.id, socialMessageId));

  return ticket;
}

export async function addSocialMessageAsReply(
  ticketId: number,
  socialMessageId: number,
  authorType: "contact" | "agent" = "contact"
): Promise<any> {
  const message = await db.query.socialMessages.findFirst({
    where: eq(socialMessages.id, socialMessageId),
  });

  if (!message) return null;

  const [ticketMessage] = await db
    .insert(ticketMessages)
    .values({
      ticketId,
      authorType,
      messageType: "reply",
      bodyHtml: message.bodyHtml || `<p>${message.bodyText}</p>`,
      bodyText: message.bodyText,
      createdAt: message.sentAt,
    })
    .returning();

  return ticketMessage;
}

export async function processIncomingSocialMessage(
  organizationId: number,
  accountId: number,
  messageInput: SocialMessageInput
): Promise<{ message: any; ticket: any | null; isNewConversation: boolean }> {
  const existingMessage = await db.query.socialMessages.findFirst({
    where: and(
      eq(socialMessages.socialAccountId, accountId),
      eq(socialMessages.platformMessageId, messageInput.platformMessageId),
      isNull(socialMessages.deletedAt)
    ),
  });

  if (existingMessage) {
    return {
      message: existingMessage,
      ticket: null,
      isNewConversation: false,
    };
  }

  const [message] = await db
    .insert(socialMessages)
    .values({
      socialAccountId: accountId,
      platform: messageInput.platform,
      platformMessageId: messageInput.platformMessageId,
      platformParentMessageId: messageInput.platformParentMessageId,
      authorPlatformUserId: messageInput.authorPlatformUserId,
      authorUsername: messageInput.authorUsername,
      authorName: messageInput.authorName,
      authorAvatarUrl: messageInput.authorAvatarUrl,
      messageType: messageInput.messageType,
      bodyText: messageInput.bodyText,
      bodyHtml: messageInput.bodyHtml,
      mediaUrls: messageInput.mediaUrls,
      linkUrls: messageInput.linkUrls,
      isIncoming: messageInput.isIncoming,
      sentAt: messageInput.sentAt || new Date(),
    })
    .returning();

  const isNewConversation = !messageInput.platformParentMessageId;

  let ticket = null;
  if (isNewConversation) {
    const contact = await findOrCreateContact(
      organizationId,
      messageInput.authorPlatformUserId,
      messageInput.authorUsername,
      messageInput.authorName,
      messageInput.authorAvatarUrl
    );

    ticket = await createTicketFromSocialMessage(organizationId, message.id, contact.id);
  }

  return { message, ticket, isNewConversation };
}

export async function replyToSocialMessage(
  ticketId: number,
  replyText: string,
  replyHtml?: string
): Promise<{ success: boolean; platformMessageId?: string; error?: string }> {
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    with: {
      socialMessage: {
        with: {
          socialAccount: true,
        },
      },
    },
  });

  if (!ticket?.socialMessage) {
    return { success: false, error: "Ticket is not from a social channel" };
  }

  const socialAccount = ticket.socialMessage.socialAccount;
  const accountData = await getAccountWithToken(socialAccount.id);

  if (!accountData) {
    return { success: false, error: "Social account not found or inactive" };
  }

  const { account, accessToken } = accountData;
  const recipientId = ticket.socialMessage.authorPlatformUserId;

  try {
    let platformMessageId: string;

    if (account.platform === "facebook" || account.platform === "instagram") {
      const result = await sendFacebookMessage(recipientId, replyText, accessToken);
      platformMessageId = result.messages?.[0]?.id || "";
    } else if (account.platform === "twitter") {
      const result = await sendTwitterDm(recipientId, replyText, accessToken);
      platformMessageId = result.dm_event_id;
    } else if (account.platform === "whatsapp") {
      const result = await sendWhatsAppMessage(recipientId, replyText);
      platformMessageId = result.messages?.[0]?.id || "";
    } else {
      return { success: false, error: `Unsupported platform: ${account.platform}` };
    }

    await db.insert(socialMessages).values({
      socialAccountId: account.id,
      ticketId,
      platform: account.platform,
      platformMessageId,
      authorPlatformUserId: "agent",
      authorUsername: "agent",
      authorName: "Support Agent",
      messageType: "text",
      bodyText: replyText,
      bodyHtml: replyHtml || `<p>${replyText}</p>`,
      isIncoming: false,
      sentAt: new Date(),
    });

    await db.insert(ticketMessages).values({
      ticketId,
      authorType: "agent",
      messageType: "reply",
      bodyText: replyText,
      bodyHtml: replyHtml || `<p>${replyText}</p>`,
    });

    return { success: true, platformMessageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send reply",
    };
  }
}

export async function pollFacebookMessages(
  accountId: number,
  organizationId: number
): Promise<void> {
  const accountData = await getAccountWithToken(accountId);
  if (!accountData) return;

  const { account, accessToken } = accountData;

  try {
    const conversations = await getFacebookConversationMessages(
      account.platformAccountId,
      accessToken,
      25
    );

    for (const conv of conversations) {
      const messages = await getFacebookConversationMessages(
        conv.id,
        accessToken,
        10
      );

      for (const msg of messages) {
        if (msg.from?.id === account.platformAccountId) continue;

        await processIncomingSocialMessage(organizationId, accountId, {
          platform: account.platform as "facebook",
          platformMessageId: msg.id,
          authorPlatformUserId: msg.from?.id || "",
          authorUsername: msg.from?.username,
          authorName: msg.from?.name,
          messageType: msg.message ? "text" : "attachment",
          bodyText: msg.message || "[Media Attachment]",
          mediaUrls: msg.attachments?.data?.map((a: any) => a.file_url),
          isIncoming: true,
          sentAt: new Date(msg.created_time),
        });
      }
    }
  } catch (error) {
    console.error("Error polling Facebook messages:", error);
  }
}

export async function pollTwitterMessages(
  accountId: number,
  organizationId: number
): Promise<void> {
  const accountData = await getAccountWithToken(accountId);
  if (!accountData) return;

  const { account, accessToken } = accountData;

  try {
    const events = await getTwitterDmEvents(accessToken, 25);

    for (const event of events) {
      if (event.event_type !== "message_create") continue;

      const senderId = event.message_create?.sender_id;
      if (senderId === account.platformAccountId) continue;

      const conversationId = event.message_create?.conversation_id;
      const messages = await getTwitterConversationMessages(conversationId, accessToken, 10);

      for (const msg of messages) {
        if (msg.create?.sender_id === account.platformAccountId) continue;

        await processIncomingSocialMessage(organizationId, accountId, {
          platform: "twitter",
          platformMessageId: msg.create?.dm_event_id || msg.id,
          authorPlatformUserId: msg.create?.sender_id || senderId,
          authorUsername: event.includes?.users?.find((u: any) => u.id === senderId)?.username,
          authorName: event.includes?.users?.find((u: any) => u.id === senderId)?.name,
          messageType: "text",
          bodyText: msg.create?.text || "[Media Attachment]",
          isIncoming: true,
          sentAt: new Date(event.created_at),
        });
      }
    }
  } catch (error) {
    console.error("Error polling Twitter messages:", error);
  }
}

export async function pollWhatsAppMessages(
  accountId: number,
  organizationId: number
): Promise<void> {
  const accountData = await getAccountWithToken(accountId);
  if (!accountData) return;

  const { account, accessToken } = accountData;

  try {
    const messages = await getWhatsAppIncomingMessages(account.platformAccountId, 25);

    for (const msg of messages) {
      if (msg.from === undefined) continue;

      let mediaUrls: string[] | undefined;
      if (msg.image) {
        mediaUrls = [msg.image.id];
      }

      await processIncomingSocialMessage(organizationId, accountId, {
        platform: "whatsapp",
        platformMessageId: msg.id,
        authorPlatformUserId: msg.from,
        messageType: msg.type || "text",
        bodyText: msg.text?.body || "[Media Attachment]",
        mediaUrls,
        isIncoming: true,
        sentAt: new Date(msg.timestamp),
      });

      await markWhatsAppMessageAsRead(msg.id, account.platformAccountId);
    }
  } catch (error) {
    console.error("Error polling WhatsApp messages:", error);
  }
}

export async function pollAllSocialAccounts(organizationId: number): Promise<void> {
  const accounts = await db.query.socialAccounts.findMany({
    where: and(
      eq(socialAccounts.organizationId, organizationId),
      eq(socialAccounts.isActive, true),
      isNull(socialAccounts.deletedAt)
    ),
  });

  for (const account of accounts) {
    try {
      if (account.platform === "facebook" || account.platform === "instagram") {
        await pollFacebookMessages(account.id, organizationId);
      } else if (account.platform === "twitter") {
        await pollTwitterMessages(account.id, organizationId);
      } else if (account.platform === "whatsapp") {
        await pollWhatsAppMessages(account.id, organizationId);
      }
    } catch (error) {
      console.error(`Error polling ${account.platform} messages for account ${account.id}:`, error);
    }
  }
}

export async function checkAndRefreshExpiredTokens(): Promise<void> {
  const now = new Date();

  const expiredAccounts = await db.query.socialAccounts.findMany({
    where: and(
      eq(socialAccounts.isActive, true),
      isNull(socialAccounts.deletedAt),
      sql`${socialAccounts.tokenExpiresAt} < ${now}`
    ),
  });

  for (const account of expiredAccounts) {
    if (!account.refreshTokenEnc) continue;

    try {
      let newTokens: { accessToken: string; refreshToken: string; expiresIn: number };

      if (account.platform === "facebook" || account.platform === "instagram") {
        const { refreshFacebookToken } = await import("./social/facebook");
        const refreshToken = decryptToken(account.refreshTokenEnc);
        newTokens = await refreshFacebookToken(refreshToken);
      } else if (account.platform === "twitter") {
        const { refreshTwitterToken } = await import("./social/twitter");
        const refreshToken = decryptToken(account.refreshTokenEnc);
        newTokens = await refreshTwitterToken(refreshToken);
      } else {
        continue;
      }

      const { encryptToken } = await import("../lib/crypto");
      const accessTokenEnc = encryptToken(newTokens.accessToken);
      const refreshTokenEnc = encryptToken(newTokens.refreshToken);

      await db
        .update(socialAccounts)
        .set({
          accessTokenEnc,
          refreshTokenEnc,
          tokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
          updatedAt: new Date(),
        })
        .where(eq(socialAccounts.id, account.id));
    } catch (error) {
      console.error(`Failed to refresh token for account ${account.id}:`, error);

      await db
        .update(socialAccounts)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(socialAccounts.id, account.id));
    }
  }
}
