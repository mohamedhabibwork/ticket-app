import { Queue, Worker, Job } from "bullmq";
import { eq, and } from "drizzle-orm";
import nodemailer from "nodemailer";

import { env } from "@ticket-app/env/server";
import { db } from "@ticket-app/db";
import { emailMessages } from "@ticket-app/db/schema/_mailboxes";

export const EMAIL_SEND_QUEUE = "email-send";

export type EmailSendJobData = {
  messageId: number;
};

const connection = {
  host: env.REDIS_URL.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(env.REDIS_URL.split(":")[2] || "6379"),
};

export const emailSendQueue = new Queue<EmailSendJobData>(EMAIL_SEND_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export async function addEmailSendJob(messageId: number): Promise<Job<EmailSendJobData>> {
  return emailSendQueue.add("send-email", { messageId }, { jobId: `email-send-${messageId}` });
}

export function createEmailSendWorker() {
  return new Worker<EmailSendJobData>(
    EMAIL_SEND_QUEUE,
    async (job: Job<EmailSendJobData>) => {
      const { messageId } = job.data;

      const emailMessage = await db.query.emailMessages.findFirst({
        where: and(eq(emailMessages.id, messageId), eq(emailMessages.direction, "outbound")),
        with: {
          mailbox: {
            with: { smtpConfig: true },
          },
        },
      });

      if (!emailMessage) {
        throw new Error(`Email message ${messageId} not found`);
      }

      if (!emailMessage.mailbox?.smtpConfig) {
        throw new Error(`SMTP config not found for mailbox ${emailMessage.mailboxId}`);
      }

      const smtp = emailMessage.mailbox.smtpConfig;
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.useTls,
        auth: {
          user: smtp.username,
          pass: smtp.passwordEnc,
        },
        tls: { rejectUnauthorized: false },
      });

      const toEmails = Array.isArray(emailMessage.toEmails) ? emailMessage.toEmails : [];

      const mailOptions = {
        from: smtp.fromEmail || emailMessage.mailbox.email,
        to: toEmails.join(", "),
        cc: emailMessage.ccEmails
          ? (Array.isArray(emailMessage.ccEmails) ? emailMessage.ccEmails : []).join(", ")
          : undefined,
        bcc: emailMessage.bccEmails
          ? (Array.isArray(emailMessage.bccEmails) ? emailMessage.bccEmails : []).join(", ")
          : undefined,
        subject: emailMessage.subject || "",
        html: emailMessage.bodyHtml || "",
        text: emailMessage.bodyText || undefined,
        inReplyTo: emailMessage.inReplyTo || undefined,
        references: emailMessage.inReplyTo
          ? `${emailMessage.inReplyTo} ${emailMessage.messageId}`
          : emailMessage.messageId,
      };

      await transporter.sendMail(mailOptions);

      await db
        .update(emailMessages)
        .set({ createdAt: new Date() })
        .where(eq(emailMessages.id, messageId));

      return { sent: true, messageId };
    },
    {
      connection,
      concurrency: 5,
    },
  );
}

export async function queueOutboundEmails(): Promise<void> {
  const pendingEmails = await db.query.emailMessages.findMany({
    where: and(eq(emailMessages.direction, "outbound")),
    columns: { id: true },
  });

  for (const email of pendingEmails) {
    await addEmailSendJob(email.id);
  }
}

export { Worker, Job };
