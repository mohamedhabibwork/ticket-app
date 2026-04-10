import { db } from "@ticket-app/db";
import { ticketAttachments } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const ticketAttachmentsRouter = {
  listByTicket: publicProcedure
    .input(z.object({ ticketId: z.coerce.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(ticketAttachments)
        .where(eq(ticketAttachments.ticketId, input.ticketId))
        .orderBy(desc(ticketAttachments.createdAt));
    }),

  listByMessage: publicProcedure
    .input(z.object({ messageId: z.coerce.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(ticketAttachments)
        .where(eq(ticketAttachments.ticketMessageId, input.messageId))
        .orderBy(desc(ticketAttachments.createdAt));
    }),

  get: publicProcedure.input(z.object({ id: z.coerce.number() })).handler(async ({ input }) => {
    const [attachment] = await db
      .select()
      .from(ticketAttachments)
      .where(eq(ticketAttachments.id, input.id));
    return attachment ?? null;
  }),

  create: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        ticketMessageId: z.coerce.number().optional(),
        filename: z.string(),
        mimeType: z.string(),
        sizeBytes: z.coerce.number(),
        storageKey: z.string(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [attachment] = await db
        .insert(ticketAttachments)
        .values({
          ticketId: input.ticketId,
          ticketMessageId: input.ticketMessageId,
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          storageKey: input.storageKey,
          createdBy: input.createdBy,
        })
        .returning();
      return attachment;
    }),

  delete: publicProcedure.input(z.object({ id: z.coerce.number() })).handler(async ({ input }) => {
    await db.delete(ticketAttachments).where(eq(ticketAttachments.id, input.id));
    return { success: true };
  }),
};
