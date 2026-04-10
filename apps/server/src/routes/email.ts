import { Hono } from "hono";

import { db } from "@ticket-app/db";
import {
  emailMessages,
  mailboxes,
  contacts,
  tickets,
  ticketMessages,
  lookups,
} from "@ticket-app/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

const emailWebhook = new Hono();

emailWebhook.post("/inbound", async (c) => {
  try {
    const body = await c.req.json();

    const { mailboxId, messageId, inReplyTo, from, to, cc, subject, html, text, headers, date } =
      body;

    const mailbox = await db.query.mailboxes.findFirst({
      where: and(
        eq(mailboxes.id, mailboxId),
        eq(mailboxes.isActive, true),
        isNull(mailboxes.deletedAt),
      ),
    });

    if (!mailbox) {
      return c.json({ error: "Mailbox not found" }, 404);
    }

    const existingMessage = await db.query.emailMessages.findFirst({
      where: and(eq(emailMessages.messageId, messageId), eq(emailMessages.mailboxId, mailboxId)),
    });

    if (existingMessage) {
      return c.json({ success: true, message: "Already processed" });
    }

    const channelLookup = await db.query.lookups.findFirst({
      where: and(
        eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'channel')`),
        sql`${lookups.metadata}->>'slug' = 'email'`,
      ),
    });

    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.email, from.email.toLowerCase()),
        eq(contacts.organizationId, mailbox.organizationId),
        isNull(contacts.deletedAt),
      ),
    });

    if (!contact) {
      const [newContact] = await db
        .insert(contacts)
        .values({
          organizationId: mailbox.organizationId,
          email: from.email.toLowerCase(),
          firstName: from.name?.split(" ")[0] || null,
          lastName: from.name?.split(" ").slice(1).join(" ") || null,
        })
        .returning();
      contact = newContact;
    }

    const [savedEmailMessage] = await db
      .insert(emailMessages)
      .values({
        organizationId: mailbox.organizationId,
        mailboxId,
        direction: "inbound",
        messageId,
        inReplyTo,
        fromEmail: from.email.toLowerCase(),
        fromName: from.name,
        toEmails: Array.isArray(to) ? to.map((e: string) => e.toLowerCase()) : [to.toLowerCase()],
        ccEmails: cc
          ? Array.isArray(cc)
            ? cc.map((e: string) => e.toLowerCase())
            : [cc.toLowerCase()]
          : null,
        subject,
        bodyHtml: html,
        bodyText: text,
        rawHeaders: headers,
        sentAt: date ? new Date(date) : new Date(),
        receivedAt: new Date(),
      })
      .returning();

    let parentTicketId: number | undefined;
    let isReply = false;

    if (inReplyTo) {
      const parentEmail = await db.query.emailMessages.findFirst({
        where: and(
          eq(emailMessages.messageId, inReplyTo),
          eq(emailMessages.organizationId, mailbox.organizationId),
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
        sql`${tickets.organizationId} = ${mailbox.organizationId} AND ${tickets.referenceNumber} LIKE ${prefix}%`,
      );
    const sequence = (countResult[0]?.count ?? 0) + 1;
    const referenceNumber = `${prefix}${sequence.toString().padStart(6, "0")}`;

    const [ticket] = await db
      .insert(tickets)
      .values({
        organizationId: mailbox.organizationId,
        mailboxId,
        referenceNumber,
        subject: subject || "(No Subject)",
        descriptionHtml: html,
        channelId: channelLookup?.id,
        contactId: contact.id,
        statusId: defaultStatusId,
        priorityId: defaultPriorityId,
        parentTicketId,
      })
      .returning();

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
        bodyHtml: html,
        bodyText: text,
      })
      .returning();

    return c.json({
      success: true,
      ticketId: ticket.id,
      referenceNumber: ticket.referenceNumber,
      isReply,
    });
  } catch (error) {
    console.error("Email webhook error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { emailWebhook };
