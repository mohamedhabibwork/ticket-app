import { Queue, Worker, Job } from "bullmq";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { mailboxes } from "@ticket-app/db/schema/_mailboxes";
import { processEmailToTicket, type EmailMessage } from "../services/email";

export const EMAIL_POLL_QUEUE = "email:poll";

const connection = {
  host: process.env.REDIS_URL?.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(process.env.REDIS_URL?.split(":")[2] || "6379"),
};

export const emailPollQueue = new Queue(EMAIL_POLL_QUEUE, {
  connection,
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

export async function addEmailPollJob(): Promise<void> {
  const activeMailboxes = await db.query.mailboxes.findMany({
    where: and(eq(mailboxes.isActive, true), isNull(mailboxes.deletedAt)),
    with: { imapConfig: true },
  });

  for (const mailbox of activeMailboxes) {
    if (mailbox.imapConfig) {
      await emailPollQueue.add(
        "poll-mailbox",
        { mailboxId: mailbox.id },
        { jobId: `email-poll-${mailbox.id}` },
      );
    }
  }
}

export function scheduleEmailPollEvery2Minutes(): void {
  emailPollQueue.add(
    "poll-all-mailboxes",
    {},
    {
      repeat: { every: 2 * 60 * 1000 },
      jobId: "email-poll-all-recurring",
    },
  );
}

export function createEmailPollWorker() {
  return new Worker(
    EMAIL_POLL_QUEUE,
    async (job: Job<{ mailboxId: number }>) => {
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

        console.error(`Email poll failed for mailbox ${mailboxId}:`, err);
        throw err;
      }
    },
    {
      connection,
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

async function pollImapMailbox(config: ImapConfig): Promise<EmailMessage[]> {
  const Imap = await import("node-imap");
  const { simpleParser } = await import("mailparser");

  return new Promise((resolve, reject) => {
    const imap = new Imap.default({
      user: config.username,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.useSsl,
      tlsOptions: { rejectUnauthorized: false },
    });

    const messages: EmailMessage[] = [];

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

          fetch.on("message", (msg: any) => {
            msg.on("body", (stream: any) => {
              simpleParser(stream, (err: Error | null, parsed: any) => {
                if (err || !parsed) return;

                const emailMessage: EmailMessage = {
                  messageId: parsed.messageId || `unknown-${Date.now()}`,
                  inReplyTo: parsed.inReplyTo || undefined,
                  fromEmail: parsed.from?.value[0]?.address || "",
                  fromName: parsed.from?.value[0]?.name,
                  toEmails: parsed.to?.value.map((t: any) => t.address || "") || [],
                  ccEmails: parsed.cc?.value.map((c: any) => c.address || "") || undefined,
                  subject: parsed.subject || "",
                  bodyHtml: (parsed.html as string) || undefined,
                  bodyText: parsed.textAsString || undefined,
                  sentAt: parsed.date || new Date(),
                  receivedAt: parsed.date || new Date(),
                  rawHeaders: Object.fromEntries(parsed.headers.entries()),
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

export { Worker, Job };
