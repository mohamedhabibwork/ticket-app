import { Worker, Job, Queue } from "bullmq";
import { eq, and, isNull, sql } from "drizzle-orm";

import { db } from "@ticket-app/db";
import {
  mailboxes,
  emailMessages,
  tickets,
  ticketMessages,
  contacts,
  lookups,
} from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";

const EMAIL_FETCH_QUEUE = `${env.QUEUE_PREFIX}-email-fetch`;

export interface EmailFetchJobData {
  mailboxId: number;
}

export interface ParsedEmail {
  messageId: string;
  inReplyTo?: string;
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  ccEmails?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  sentAt: Date;
  receivedAt: Date;
  rawHeaders?: Record<string, string>;
  attachments: Array<{
    filename: string;
    mimeType: string;
    content: Buffer;
  }>;
  spamScore?: number;
  isSpam: boolean;
}

const emailFetchQueue = new Queue<EmailFetchJobData>(EMAIL_FETCH_QUEUE, {
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

export async function addEmailFetchJob(mailboxId: number): Promise<void> {
  await emailFetchQueue.add(
    "fetch-emails",
    { mailboxId },
    {
      jobId: `email-fetch-${mailboxId}`,
    },
  );
}

export async function scheduleEmailFetchPoll(intervalMs: number = 120000): Promise<void> {
  // Cast to EmailFetchJobData since this recurring job doesn't need a specific mailboxId
  await emailFetchQueue.add("poll-all-mailboxes", { mailboxId: -1 } as EmailFetchJobData, {
    repeat: { every: intervalMs },
    jobId: "email-fetch-poll-recurring",
  });
}

export function createEmailFetchWorker(): Worker {
  return new Worker(
    EMAIL_FETCH_QUEUE,
    async (job: Job<EmailFetchJobData>) => {
      const { mailboxId } = job.data;

      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, mailboxId),
          eq(mailboxes.isActive, true),
          isNull(mailboxes.deletedAt),
        ),
        with: { imapConfig: true },
      });

      if (!mailbox?.imapConfig) {
        return { polled: 0, success: true, skipped: true };
      }

      const { host, port, username, passwordEnc, useSsl } = mailbox.imapConfig;

      try {
        const emails = await pollImapMailbox({
          host,
          port,
          username,
          password: passwordEnc,
          useSsl,
          lastSyncAt: mailbox.lastSyncedAt,
        });

        for (const email of emails) {
          try {
            await processEmailToTicket(mailbox.organizationId, mailboxId, email);
          } catch (err) {
            console.error(`Failed to process email ${email.messageId}:`, err);
          }
        }

        await db
          .update(mailboxes)
          .set({
            lastSyncedAt: new Date(),
            syncError: null,
            updatedAt: new Date(),
          })
          .where(eq(mailboxes.id, mailboxId));

        return { polled: emails.length, success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";

        await db
          .update(mailboxes)
          .set({
            syncError: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(mailboxes.id, mailboxId));

        console.error(`Email fetch failed for mailbox ${mailboxId}:`, err);
        throw err;
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    },
  );
}

interface ImapConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useSsl: boolean;
  lastSyncAt: Date | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ImapModule = any;

async function pollImapMailbox(config: ImapConfig): Promise<ParsedEmail[]> {
  const ImapModule = (await import("imap")) as ImapModule;
  const mailparserModule = await import("mailparser");
  const Imap = ImapModule.default;
  const simpleParser = mailparserModule.simpleParser;

  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.username,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.useSsl,
      tlsOptions: { rejectUnauthorized: false },
    });

    const messages: ParsedEmail[] = [];

    imap.on("ready", () => {
      imap.openBox("INBOX", true, (err: Error | null) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        const searchSince = config.lastSyncAt
          ? new Date(config.lastSyncAt.getTime() - 60000)
          : new Date(Date.now() - 24 * 60 * 60 * 1000);

        imap.search(["SINCE", searchSince], (err: Error | null, results: number[]) => {
          if (err || !results || results.length === 0) {
            imap.end();
            return resolve([]);
          }

          const fetch = imap.fetch(results, {
            bodies: "",
            struct: true,
          });

          fetch.on("message", (msg: ImapModule) => {
            msg.on("body", (stream: ImapModule) => {
              simpleParser(stream, (err: Error | null, parsed: ImapModule) => {
                if (err || !parsed) return;

                const spamScore = calculateSpamScore(parsed);
                const isSpam = spamScore > 5;

                const emailMessage: ParsedEmail = {
                  messageId: parsed.messageId || `unknown-${Date.now()}`,
                  inReplyTo: parsed.inReplyTo || undefined,
                  fromEmail: parsed.from?.value?.[0]?.address || "",
                  fromName: parsed.from?.value?.[0]?.name,
                  toEmails: parsed.to?.value?.map((t: ImapModule) => t.address || "") || [],
                  ccEmails: parsed.cc?.value?.map((c: ImapModule) => c.address || "") || undefined,
                  subject: parsed.subject || "",
                  bodyHtml: parsed.html || undefined,
                  bodyText: parsed.textAsString || undefined,
                  sentAt: parsed.date || new Date(),
                  receivedAt: parsed.date || new Date(),
                  rawHeaders: parsed.headers
                    ? Object.fromEntries(parsed.headers.entries())
                    : undefined,
                  attachments: parseAttachments(parsed),
                  spamScore,
                  isSpam,
                };

                messages.push(emailMessage);
              });
            });
          });

          fetch.on("end", () => {
            imap.end();
            resolve(messages);
          });

          fetch.on("error", (fetchErr: Error) => {
            imap.end();
            reject(fetchErr);
          });
        });
      });
    });

    imap.on("error", (imapErr: Error) => {
      reject(imapErr);
    });

    imap.connect();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAttachments(parsed: any): Array<{
  filename: string;
  mimeType: string;
  content: Buffer;
}> {
  const attachments: Array<{ filename: string; mimeType: string; content: Buffer }> = [];

  if (parsed.attachments) {
    for (const attachment of parsed.attachments) {
      attachments.push({
        filename: attachment.filename || "unnamed",
        mimeType: attachment.contentType || "application/octet-stream",
        content: attachment.content,
      });
    }
  }

  return attachments;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateSpamScore(parsed: any): number {
  let score = 0;
  const subject = (parsed.subject || "").toLowerCase();
  const body = (parsed.text || "").toLowerCase();

  const spamKeywords = [
    "viagra",
    "cialis",
    "lottery",
    "winner",
    "prize",
    "click here",
    "act now",
    "limited time",
    "free money",
    "congratulations",
    "urgent",
    "immediate action",
    "suspicious",
  ];

  for (const keyword of spamKeywords) {
    if (subject.includes(keyword)) score += 1;
    if (body.includes(keyword)) score += 0.5;
  }

  if (parsed.from?.value?.[0]?.address?.includes("noreply")) score += 0.5;
  if (!parsed.text && parsed.html) score += 1;

  return score;
}

async function processEmailToTicket(
  organizationId: number,
  mailboxId: number,
  email: ParsedEmail,
): Promise<{ ticket: unknown; isReply: boolean }> {
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
    if (!newContact) {
      throw new Error("Failed to create contact");
    }
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
      subject: email.subject,
      bodyHtml: email.bodyHtml,
      bodyText: email.bodyText,
      rawHeaders: email.rawHeaders,
      sentAt: email.sentAt,
      receivedAt: email.receivedAt,
      isSpam: email.isSpam,
      spamScore: email.spamScore?.toString(),
    })
    .returning();

  if (!savedEmailMessage) {
    throw new Error("Failed to save email message");
  }

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
      contactId: contact.id,
      statusId: defaultStatusId!,
      priorityId: defaultPriorityId!,
      parentTicketId,
      isSpam: email.isSpam,
    })
    .returning();

  if (!ticket) {
    throw new Error("Failed to create ticket");
  }

  await db
    .update(emailMessages)
    .set({ ticketId: ticket.id })
    .where(eq(emailMessages.id, savedEmailMessage.id));

  await db
    .insert(ticketMessages)
    .values({
      ticketId: ticket.id,
      emailMessageId: savedEmailMessage.id,
      authorType: "contact",
      authorContactId: contact.id,
      messageType: "email",
      bodyHtml: email.bodyHtml,
      bodyText: email.bodyText,
    })
    .returning();

  return { ticket, isReply };
}

export async function closeEmailFetchQueue(): Promise<void> {
  await emailFetchQueue.close();
}

export { Worker, Job, Queue };
