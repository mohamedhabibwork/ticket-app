import { db } from "@ticket-app/db";
import { ticketMessages, ticketAttachments, tickets, auditLogs } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";
import { workflowTriggers } from "../services/workflowTriggers";

const messageTypeEnum = z.enum(["reply", "note", "activity"]);
const authorTypeEnum = z.enum(["agent", "contact", "system", "bot"]);

export const ticketMessagesRouter = {
  listByTicket: publicProcedure
    .input(z.object({ ticketId: z.coerce.number() }))
    .handler(async ({ input }) => {
      return await db
        .select({
          id: ticketMessages.id,
          uuid: ticketMessages.uuid,
          ticketId: ticketMessages.ticketId,
          authorType: ticketMessages.authorType,
          authorUserId: ticketMessages.authorUserId,
          authorContactId: ticketMessages.authorContactId,
          messageType: ticketMessages.messageType,
          bodyHtml: ticketMessages.bodyHtml,
          bodyText: ticketMessages.bodyText,
          isPrivate: ticketMessages.isPrivate,
          createdAt: ticketMessages.createdAt,
          createdBy: ticketMessages.createdBy,
        })
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, input.ticketId))
        .orderBy(desc(ticketMessages.createdAt));
    }),

  get: publicProcedure.input(z.object({ id: z.coerce.number() })).handler(async ({ input }) => {
    const [message] = await db.select().from(ticketMessages).where(eq(ticketMessages.id, input.id));
    return message ?? null;
  }),

  create: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        authorType: authorTypeEnum,
        authorUserId: z.coerce.number().optional(),
        authorContactId: z.coerce.number().optional(),
        messageType: messageTypeEnum,
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
        isPrivate: z.coerce.boolean().default(false),
        attachments: z
          .array(
            z.object({
              filename: z.string(),
              mimeType: z.string(),
              sizeBytes: z.coerce.number(),
              storageKey: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [message] = await db
        .insert(ticketMessages)
        .values({
          ticketId: input.ticketId,
          authorType: input.authorType,
          authorUserId: input.authorUserId,
          authorContactId: input.authorContactId,
          messageType: input.messageType,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          isPrivate: input.isPrivate,
          createdBy: input.authorUserId,
        })
        .returning();

      if (input.attachments && input.attachments.length > 0 && message) {
        await db.insert(ticketAttachments).values(
          input.attachments.map(
            (att) =>
              ({
                ticketId: input.ticketId,
                ticketMessageId: message.id,
                filename: att.filename,
                mimeType: att.mimeType,
                sizeBytes: att.sizeBytes,
                storageKey: att.storageKey,
                createdBy: input.authorUserId,
              }) as any,
          ),
        );
      }

      if (!input.isPrivate && input.messageType === "reply") {
        await db
          .update(tickets)
          .set({ firstResponseAt: new Date(), updatedAt: new Date() })
          .where(eq(tickets.id, input.ticketId));
      }

      return message;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(ticketMessages)
        .set({
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          updatedAt: new Date(),
        })
        .where(eq(ticketMessages.id, input.id))
        .returning();
      return updated;
    }),

  delete: publicProcedure.input(z.object({ id: z.coerce.number() })).handler(async ({ input }) => {
    await db.delete(ticketAttachments).where(eq(ticketAttachments.ticketMessageId, input.id));
    await db.delete(ticketMessages).where(eq(ticketMessages.id, input.id));
    return { success: true };
  }),

  lockThread: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        lockedBy: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(ticketMessages)
        .set({
          isLocked: true,
          lockedBy: input.lockedBy,
          lockedAt: new Date(),
        })
        .where(eq(ticketMessages.id, input.id))
        .returning();
      return updated;
    }),

  unlockThread: publicProcedure
    .input(z.object({ id: z.coerce.number() }))
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(ticketMessages)
        .set({
          isLocked: false,
          lockedBy: null,
          lockedAt: null,
        })
        .where(eq(ticketMessages.id, input.id))
        .returning();
      return updated;
    }),

  omitThread: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        reason: z.string().min(1),
        omittedBy: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const message = await db.query.ticketMessages.findFirst({
        where: eq(ticketMessages.id, input.id),
        with: { ticket: true },
      });

      if (!message) {
        throw new Error("Message not found");
      }

      const [updated] = await db
        .update(ticketMessages)
        .set({
          deletedAt: new Date(),
          deletedBy: input.omittedBy,
          deletedReason: input.reason,
        })
        .where(eq(ticketMessages.id, input.id))
        .returning();

      await db.insert(auditLogs).values({
        userId: input.omittedBy,
        organizationId: message.ticket.organizationId,
        action: "thread_omitted",
        resourceType: "ticket_message",
        resourceId: String(input.id),
        metadata: { reason: input.reason, ticketId: message.ticketId },
      });

      await workflowTriggers.triggerWorkflows(
        "ticket_thread_omitted" as any,
        { ...message.ticket, id: message.ticketId } as any,
      );

      return updated;
    }),
};
