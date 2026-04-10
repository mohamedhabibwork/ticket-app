import { db } from "@ticket-app/db";
import { tags, ticketTags } from "@ticket-app/db/schema";
import { eq, and, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const tagsRouter = {
  list: publicProcedure
    .input(z.object({ organizationId: z.coerce.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(tags)
        .where(eq(tags.organizationId, input.organizationId))
        .orderBy(desc(tags.createdAt));
    }),

  get: publicProcedure.input(z.object({ id: z.coerce.number() })).handler(async ({ input }) => {
    const [tag] = await db.select().from(tags).where(eq(tags.id, input.id));
    return tag ?? null;
  }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(100),
        color: z.string().max(7).optional(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [tag] = await db
        .insert(tags)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          color: input.color,
          createdBy: input.createdBy,
        })
        .returning();
      return tag;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().max(7).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(tags)
        .set({
          name: input.name,
          color: input.color,
        })
        .where(eq(tags.id, input.id))
        .returning();
      return updated;
    }),

  delete: publicProcedure.input(z.object({ id: z.coerce.number() })).handler(async ({ input }) => {
    await db.delete(ticketTags).where(eq(ticketTags.tagId, input.id));
    await db.delete(tags).where(eq(tags.id, input.id));
    return { success: true };
  }),

  addToTicket: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        tagId: z.coerce.number(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [ticketTag] = await db
        .insert(ticketTags)
        .values({
          ticketId: input.ticketId,
          tagId: input.tagId,
          createdBy: input.createdBy,
        })
        .onConflictDoNothing()
        .returning();
      return ticketTag;
    }),

  removeFromTicket: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        tagId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .delete(ticketTags)
        .where(and(eq(ticketTags.ticketId, input.ticketId), eq(ticketTags.tagId, input.tagId)));
      return { success: true };
    }),

  getByTicket: publicProcedure
    .input(z.object({ ticketId: z.coerce.number() }))
    .handler(async ({ input }) => {
      return await db
        .select({
          id: tags.id,
          uuid: tags.uuid,
          name: tags.name,
          color: tags.color,
        })
        .from(tags)
        .innerJoin(ticketTags, eq(ticketTags.tagId, tags.id))
        .where(eq(ticketTags.ticketId, input.ticketId));
    }),
};
