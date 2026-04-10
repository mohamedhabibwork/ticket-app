import { db } from "@ticket-app/db";
import {
  mailboxes,
  mailboxImapConfigs,
  emailMessages,
  tickets,
  ticketMessages,
  contacts,
  lookups,
} from "@ticket-app/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { env } from "@ticket-app/env/server";
import { decryptToken, encryptToken } from "../lib/crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface EmailMessage {
  messageId: string;
  inReplyTo?: string;
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  sentAt: Date;
  receivedAt: Date;
  rawHeaders?: Record<string, string>;
}

export interface GmailOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function refreshGmailAccessToken(
  mailboxId: number,
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  const config = await db.query.mailboxImapConfigs.findFirst({
    where: eq(mailboxImapConfigs.mailboxId, mailboxId),
  });

  if (!config?.oauthRefreshTokenEnc) {
    return null;
  }

  const refreshToken = decryptToken(config.oauthRefreshTokenEnc);
  const now = new Date();
  const tokenExpiresAt = config.oauthExpiresAt ? new Date(config.oauthExpiresAt) : null;

  if (tokenExpiresAt && tokenExpiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    const accessToken = decryptToken(config.oauthTokenEnc!);
    return { accessToken, expiresAt: tokenExpiresAt };
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to refresh Gmail token for mailbox ${mailboxId}:`, errorText);
    return null;
  }

  const tokens = (await response.json()) as GmailOAuthTokens;
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await db
    .update(mailboxImapConfigs)
    .set({
      oauthTokenEnc: encryptToken(tokens.access_token),
      oauthExpiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(mailboxImapConfigs.mailboxId, mailboxId));

  return { accessToken: tokens.access_token, expiresAt: newExpiresAt };
}

export async function pollMailbox(mailboxId: number): Promise<EmailMessage[]> {
  const mailbox = await db.query.mailboxes.findFirst({
    where: and(
      eq(mailboxes.id, mailboxId),
      eq(mailboxes.isActive, true),
      isNull(mailboxes.deletedAt),
    ),
    with: {
      imapConfig: true,
    },
  });

  if (!mailbox || !mailbox.imapConfig) {
    return [];
  }

  return [];
}

export async function processEmailToTicket(
  organizationId: number,
  mailboxId: number,
  email: EmailMessage,
): Promise<{ ticket: any; isReply: boolean }> {
  const existingEmailMessage = await db.query.emailMessages.findFirst({
    where: and(
      eq(emailMessages.messageId, email.messageId),
      eq(emailMessages.mailboxId, mailboxId),
    ),
  });

  if (existingEmailMessage) {
    return { ticket: null, isReply: false };
  }

  const channelLookup = await db.query.lookups.findFirst({
    where: and(
      eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'channel')`),
      sql`${lookups.metadata}->>'slug' = 'email'`,
    ),
  });

  let contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.email, email.fromEmail.toLowerCase()),
      eq(contacts.organizationId, organizationId),
      isNull(contacts.deletedAt),
    ),
  });

  if (!contact) {
    const [newContact] = await db
      .insert(contacts)
      .values({
        organizationId,
        email: email.fromEmail.toLowerCase(),
        firstName: email.fromName?.split(" ")[0] || null,
        lastName: email.fromName?.split(" ").slice(1).join(" ") || null,
      })
      .returning();
    contact = newContact;
  }

  const [savedEmailMessage] = await db
    .insert(emailMessages)
    .values({
      organizationId,
      mailboxId,
      direction: "inbound",
      messageId: email.messageId,
      inReplyTo: email.inReplyTo,
      fromEmail: email.fromEmail.toLowerCase(),
      fromName: email.fromName,
      toEmails: email.toEmails.map((e) => e.toLowerCase()),
      ccEmails: email.ccEmails?.map((e) => e.toLowerCase()),
      bccEmails: email.bccEmails?.map((e) => e.toLowerCase()),
      subject: email.subject,
      bodyHtml: email.bodyHtml,
      bodyText: email.bodyText,
      rawHeaders: email.rawHeaders,
      sentAt: email.sentAt,
      receivedAt: email.receivedAt,
    })
    .returning();

  let parentTicketId: number | undefined;
  let isReply = false;

  if (email.inReplyTo) {
    const parentEmail = await db.query.emailMessages.findFirst({
      where: and(
        eq(emailMessages.messageId, email.inReplyTo),
        eq(emailMessages.organizationId, organizationId),
      ),
    });

    if (parentEmail?.ticketId) {
      parentTicketId = parentEmail.ticketId;
      isReply = true;
    }
  }

  const defaultStatusId = (
    await db.query.lookups.findFirst({
      where: and(
        eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'ticket_status')`),
        eq(lookups.isDefault, true),
      ),
    })
  )?.id;

  const defaultPriorityId = (
    await db.query.lookups.findFirst({
      where: and(
        eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'ticket_priority')`),
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
      sql`${tickets.organizationId} = ${organizationId} AND ${tickets.referenceNumber} LIKE ${prefix}%`,
    );
  const sequence = (countResult[0]?.count ?? 0) + 1;
  const referenceNumber = `${prefix}${sequence.toString().padStart(6, "0")}`;

  const [ticket] = await db
    .insert(tickets)
    .values({
      organizationId,
      mailboxId,
      referenceNumber,
      subject: email.subject || "(No Subject)",
      descriptionHtml: email.bodyHtml,
      channelId: channelLookup?.id,
      contactId: contact?.id,
      statusId: defaultStatusId,
      priorityId: defaultPriorityId,
      parentTicketId,
    })
    .returning();

  await db
    .update(emailMessages)
    .set({ ticketId: ticket!.id })
    .where(eq(emailMessages.id, savedEmailMessage!.id));

  await db
    .insert(ticketMessages)
    .values({
      ticketId: ticket.id,
      emailMessageId: savedEmailMessage!.id,
      authorType: "contact",
      authorContactId: contact?.id,
      messageType: "email",
      bodyHtml: email.bodyHtml,
      bodyText: email.bodyText,
    })
    .returning();

  return { ticket, isReply };
}
