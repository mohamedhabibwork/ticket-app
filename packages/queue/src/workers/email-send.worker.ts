import { Worker, Job, Queue } from "bullmq";
import { eq, and, isNull } from "drizzle-orm";
import nodemailer from "nodemailer";

import { db } from "@ticket-app/db";
import { mailboxes, emailMessages } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";

const EMAIL_SEND_QUEUE = `${env.QUEUE_PREFIX}-email-send`;

export interface EmailSendJobData {
  mailboxId: number;
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  inReplyTo?: string;
  ticketId?: number;
  templateId?: number;
  mergeTags?: Record<string, string>;
}

export interface SendEmailResult {
  messageId: string;
  success: boolean;
  error?: string;
}

const emailSendQueue = new Queue(EMAIL_SEND_QUEUE, {
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

export async function addEmailSendJob(data: EmailSendJobData): Promise<Job<EmailSendJobData>> {
  return emailSendQueue.add("send-email", data);
}

export function createEmailSendWorker(): Worker {
  return new Worker(
    EMAIL_SEND_QUEUE,
    async (job: Job<EmailSendJobData>) => {
      const {
        mailboxId,
        toEmails,
        ccEmails,
        bccEmails,
        subject,
        bodyHtml,
        bodyText,
        inReplyTo,
        ticketId,
        mergeTags,
      } = job.data;

      const mailbox = await db.query.mailboxes.findFirst({
        where: and(
          eq(mailboxes.id, mailboxId),
          eq(mailboxes.isActive, true),
          isNull(mailboxes.deletedAt),
        ),
        with: { smtpConfig: true },
      });

      if (!mailbox?.smtpConfig) {
        throw new Error(`SMTP config not found for mailbox ${mailboxId}`);
      }

      const { host, port, username, passwordEnc, useTls, fromName, fromEmail } = mailbox.smtpConfig;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: useTls,
        auth: {
          user: username,
          pass: passwordEnc,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const renderedHtml = mergeTags ? renderTemplate(bodyHtml, mergeTags) : bodyHtml;
      const renderedText = mergeTags && bodyText ? renderTemplate(bodyText, mergeTags) : bodyText;

      const fromAddress = fromEmail || mailbox.email;
      const fromDisplay = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

      const mailOptions = {
        from: fromDisplay,
        to: toEmails.join(", "),
        cc: ccEmails?.join(", "),
        bcc: bccEmails?.join(", "),
        subject,
        html: renderedHtml,
        text: renderedText,
        inReplyTo,
        references: inReplyTo ? inReplyTo : undefined,
      };

      try {
        const sendResult = await transporter.sendMail(mailOptions);
        const messageId = sendResult.messageId;

        await logSentEmail({
          organizationId: mailbox.organizationId,
          mailboxId,
          ticketId,
          messageId,
          inReplyTo,
          fromEmail: fromAddress,
          fromName,
          toEmails,
          ccEmails,
          bccEmails,
          subject,
          bodyHtml: renderedHtml,
          bodyText: renderedText,
        });

        await transporter.close();

        return { messageId, success: true };
      } catch (err) {
        await transporter.close();
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to send email for mailbox ${mailboxId}:`, err);
        throw new Error(`Email send failed: ${errorMessage}`);
      }
    },
    {
      connection: getRedis(),
      concurrency: 5,
    },
  );
}

function renderTemplate(template: string, mergeTags: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(mergeTags)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    rendered = rendered.replace(regex, value);
  }
  return rendered;
}

interface LogSentEmailParams {
  organizationId: number;
  mailboxId: number;
  ticketId?: number;
  messageId: string;
  inReplyTo?: string;
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

async function logSentEmail(params: LogSentEmailParams): Promise<void> {
  const {
    organizationId,
    mailboxId,
    ticketId,
    messageId,
    inReplyTo,
    fromEmail,
    fromName,
    toEmails,
    ccEmails,
    bccEmails,
    subject,
    bodyHtml,
    bodyText,
  } = params;

  await db
    .insert(emailMessages)
    .values({
      organizationId,
      mailboxId,
      ticketId,
      direction: "outbound",
      messageId,
      inReplyTo,
      fromEmail,
      fromName,
      toEmails,
      ccEmails,
      bccEmails,
      subject,
      bodyHtml,
      bodyText,
      sentAt: new Date(),
      receivedAt: new Date(),
    })
    .returning();
}

export async function handleBounceNotification(bounceData: {
  messageId: string;
  bounceType: "hard" | "soft" | "permanent" | "transient";
  timestamp: Date;
}): Promise<void> {
  const { messageId, bounceType } = bounceData;

  const emailMessage = await db.query.emailMessages.findFirst({
    where: eq(emailMessages.messageId, messageId),
  });

  if (!emailMessage) {
    console.warn(`Bounce notification for unknown messageId: ${messageId}`);
    return;
  }

  await db
    .update(emailMessages)
    .set({
      bounceType,
    })
    .where(eq(emailMessages.id, emailMessage.id));

  if (emailMessage.ticketId) {
    console.log(`Ticket ${emailMessage.ticketId} email bounced: ${bounceType}`);
  }
}

export async function closeEmailSendQueue(): Promise<void> {
  await emailSendQueue.close();
}

export { Worker, Job, Queue };
