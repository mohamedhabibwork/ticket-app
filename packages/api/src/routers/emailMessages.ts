import { db } from "@ticket-app/db";
import { emailMessages, emailAttachments, mailboxes, tickets, ticketMessages } from "@ticket-app/db/schema";
import { eq, and, isNull, desc, sql, or } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const emailMessagesRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        mailboxId: z.number().optional(),
        direction: z.enum(["inbox", "sent", "draft"]).optional(),
        ticketId: z.number().optional(),
        isSpam: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [eq(emailMessages.organizationId, input.organizationId)];

      if (input.mailboxId) conditions.push(eq(emailMessages.mailboxId, input.mailboxId));
      if (input.ticketId) conditions.push(eq(emailMessages.ticketId, input.ticketId));
      if (input.isSpam !== undefined) conditions.push(eq(emailMessages.isSpam, input.isSpam));
      if (input.search) {
        conditions.push(
          or(
            sql`${emailMessages.subject} ILIKE ${`%${input.search}%`}`,
            sql`${emailMessages.bodyText} ILIKE ${`%${input.search}%`}`,
          )!,
        );
      }

      let directionFilter;
      if (input.direction === "inbox") {
        directionFilter = eq(emailMessages.direction, "inbound");
      } else if (input.direction === "sent") {
        directionFilter = eq(emailMessages.direction, "outbound");
      }

      if (directionFilter) conditions.push(directionFilter);

      return await db.query.emailMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(emailMessages.receivedAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          mailbox: true,
          attachments: true,
        },
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.emailMessages.findFirst({
        where: and(
          eq(emailMessages.id, input.id),
          eq(emailMessages.organizationId, input.organizationId),
        ),
        with: {
          mailbox: true,
          attachments: true,
          ticket: {
            with: {
              contact: true,
              status: true,
              priority: true,
            },
          },
        },
      });
    }),

  send: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        mailboxId: z.number(),
        toEmails: z.array(z.string().email()),
        ccEmails: z.array(z.string().email()).optional(),
        bccEmails: z.array(z.string().email()).optional(),
        subject: z.string().min(1).max(500),
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
        inReplyTo: z.string().optional(),
        ticketId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const [message] = await db
        .insert(emailMessages)
        .values({
          organizationId: input.organizationId,
          mailboxId: input.mailboxId,
          ticketId: input.ticketId,
          direction: "outbound",
          messageId,
          inReplyTo: input.inReplyTo,
          fromEmail: "",
          toEmails: input.toEmails,
          ccEmails: input.ccEmails || null,
          bccEmails: input.bccEmails || null,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          sentAt: new Date(),
          receivedAt: new Date(),
        })
        .returning();

      return message;
    }),

  reply: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        ticketId: z.number(),
        mailboxId: z.number(),
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
        ccEmails: z.array(z.string().email()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const ticket = await db.query.tickets.findFirst({
        where: and(
          eq(tickets.id, input.ticketId),
          eq(tickets.organizationId, input.organizationId),
        ),
        with: {
          mailbox: true,
        },
      });

      if (!ticket) throw new Error("Ticket not found");

      const originalMessage = await db.query.emailMessages.findFirst({
        where: eq(emailMessages.ticketId, input.ticketId),
        orderBy: [desc(emailMessages.receivedAt)],
      });

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const [message] = await db
        .insert(emailMessages)
        .values({
          organizationId: input.organizationId,
          mailboxId: input.mailboxId,
          ticketId: input.ticketId,
          direction: "outbound",
          messageId,
          inReplyTo: originalMessage?.messageId,
          fromEmail: "",
          toEmails: [],
          ccEmails: input.ccEmails || null,
          subject: ticket.subject,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          sentAt: new Date(),
          receivedAt: new Date(),
        })
        .returning();

      return message;
    }),

  forward: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        ticketId: z.number(),
        forwardTo: z.array(z.string().email()),
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const ticket = await db.query.tickets.findFirst({
        where: and(
          eq(tickets.id, input.ticketId),
          eq(tickets.organizationId, input.organizationId),
        ),
      });

      if (!ticket) throw new Error("Ticket not found");

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const [message] = await db
        .insert(emailMessages)
        .values({
          organizationId: input.organizationId,
          mailboxId: ticket.mailboxId!,
          ticketId: input.ticketId,
          direction: "outbound",
          messageId,
          fromEmail: "",
          toEmails: input.forwardTo,
          subject: `Fwd: ${ticket.subject}`,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          sentAt: new Date(),
          receivedAt: new Date(),
        })
        .returning();

      return message;
    }),

  markSpam: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(emailMessages)
        .set({
          isSpam: true,
        })
        .where(and(eq(emailMessages.id, input.id), eq(emailMessages.organizationId, input.organizationId)))
        .returning();
      return updated;
    }),

  markNotSpam: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(emailMessages)
        .set({
          isSpam: false,
        })
        .where(and(eq(emailMessages.id, input.id), eq(emailMessages.organizationId, input.organizationId)))
        .returning();
      return updated;
    }),

  getAttachment: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const attachment = await db.query.emailAttachments.findFirst({
        where: and(
          eq(emailAttachments.id, input.id),
        ),
        with: {
          emailMessage: {
            with: {
              mailbox: true,
            },
          },
        },
      });

      if (!attachment) return null;
      if (attachment.emailMessage.organizationId !== input.organizationId) return null;

      return attachment;
    }),

  getThread: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        messageId: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const rootMessage = await db.query.emailMessages.findFirst({
        where: and(
          eq(emailMessages.messageId, input.messageId),
          eq(emailMessages.organizationId, input.organizationId),
        ),
      });

      if (!rootMessage) return null;

      const threadMessages = await db.query.emailMessages.findMany({
        where: and(
          eq(emailMessages.organizationId, input.organizationId),
          or(
            eq(emailMessages.messageId, input.messageId),
            eq(emailMessages.inReplyTo, input.messageId),
          ),
        ),
        orderBy: [emailMessages.receivedAt],
        with: {
          attachments: true,
        },
      });

      return {
        rootMessage,
        threadMessages,
      };
    }),
};
