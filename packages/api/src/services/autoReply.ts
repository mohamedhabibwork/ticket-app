import { db } from "@ticket-app/db";
import { mailboxes } from "@ticket-app/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export interface AutoReplyData {
  mailboxId: number;
  toEmail: string;
  toName?: string;
  subject: string;
  ticketReference: string;
  messageBody?: string;
}

export async function getAutoReply(
  mailboxId: number,
): Promise<{ subject: string; bodyHtml: string } | null> {
  const mailbox = await db.query.mailboxes.findFirst({
    where: and(
      eq(mailboxes.id, mailboxId),
      eq(mailboxes.autoReplyEnabled, true),
      eq(mailboxes.isActive, true),
      isNull(mailboxes.deletedAt),
    ),
  });

  if (!mailbox || !mailbox.autoReplySubject || !mailbox.autoReplyBodyHtml) {
    return null;
  }

  return {
    subject: mailbox.autoReplySubject,
    bodyHtml: mailbox.autoReplyBodyHtml,
  };
}

export function buildAutoReplyEmail(
  data: AutoReplyData,
  template: { subject: string; bodyHtml: string },
): { subject: string; bodyHtml: string } {
  let subject = template.subject
    .replace(/\{reference\}/g, data.ticketReference)
    .replace(/\{ticket_reference\}/g, data.ticketReference)
    .replace(/\{subject\}/g, data.subject);

  let bodyHtml = template.bodyHtml
    .replace(/\{reference\}/g, data.ticketReference)
    .replace(/\{ticket_reference\}/g, data.ticketReference)
    .replace(/\{subject\}/g, data.subject)
    .replace(/\{customer_name\}/g, data.toName || "Customer")
    .replace(/\{customer_email\}/g, data.toEmail);

  if (data.messageBody) {
    bodyHtml = bodyHtml.replace(/\{message\}/g, data.messageBody);
  }

  return { subject, bodyHtml };
}
