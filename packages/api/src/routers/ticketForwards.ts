import { db } from "@ticket-app/db";
import { ticketForwards } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const ticketForwardsRouter = {
  create: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        messageId: z.number().optional(),
        to: z.array(z.string().email()),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string().optional(),
        body: z.string(),
        forwardedBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [forward] = await db
        .insert(ticketForwards)
        .values({
          ticketId: input.ticketId,
          ticketMessageId: input.messageId,
          forwardedTo: input.to,
          ccEmails: input.cc || [],
          bccEmails: input.bcc || [],
          subject: input.subject,
          bodyHtml: input.body,
          forwardedBy: input.forwardedBy,
        })
        .returning();

      return forward;
    }),

  list: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.ticketForwards.findMany({
        where: eq(ticketForwards.ticketId, input.ticketId),
        orderBy: [desc(ticketForwards.forwardedAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      return await db.query.ticketForwards.findFirst({
        where: eq(ticketForwards.id, input.id),
      });
    }),
};
