import { db } from "@ticket-app/db";
import { ticketViews } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

const ticketViewFiltersSchema = z.object({
  status: z.array(z.number()).optional(),
  priority: z.array(z.number()).optional(),
  assignedAgentId: z.array(z.number()).optional(),
  assignedTeamId: z.array(z.number()).optional(),
  tags: z.array(z.number()).optional(),
  channelId: z.array(z.number()).optional(),
  isSpam: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const ticketViewsRouter = {
  list: publicProcedure
    .input(z.object({ organizationId: z.number(), userId: z.number().optional() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(ticketViews)
        .where(eq(ticketViews.organizationId, input.organizationId))
        .orderBy(desc(ticketViews.createdAt));
    }),

  get: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [view] = await db.select().from(ticketViews).where(eq(ticketViews.id, input.id));
    return view ?? null;
  }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        userId: z.number().optional(),
        name: z.string().min(1).max(150),
        filters: ticketViewFiltersSchema,
        sortBy: z.string().max(50).default("created_at"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
        isDefault: z.boolean().default(false),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      if (input.isDefault) {
        await db
          .update(ticketViews)
          .set({ isDefault: false })
          .where(eq(ticketViews.organizationId, input.organizationId));
      }

      const [view] = await db
        .insert(ticketViews)
        .values({
          organizationId: input.organizationId,
          userId: input.userId,
          name: input.name,
          filters: input.filters,
          sortBy: input.sortBy,
          sortDir: input.sortDir,
          isDefault: input.isDefault,
          createdBy: input.createdBy,
        })
        .returning();
      return view;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(150).optional(),
        filters: ticketViewFiltersSchema.optional(),
        sortBy: z.string().max(50).optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [view] = await db.select().from(ticketViews).where(eq(ticketViews.id, input.id));

      if (input.isDefault && view) {
        await db
          .update(ticketViews)
          .set({ isDefault: false })
          .where(eq(ticketViews.organizationId, view.organizationId));
      }

      const [updated] = await db
        .update(ticketViews)
        .set({
          name: input.name,
          filters: input.filters,
          sortBy: input.sortBy,
          sortDir: input.sortDir,
          isDefault: input.isDefault,
        })
        .where(eq(ticketViews.id, input.id))
        .returning();
      return updated;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(ticketViews).where(eq(ticketViews.id, input.id));
    return { success: true };
  }),

  setDefault: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [view] = await db.select().from(ticketViews).where(eq(ticketViews.id, input.id));

    if (view) {
      await db
        .update(ticketViews)
        .set({ isDefault: false })
        .where(eq(ticketViews.organizationId, view.organizationId));
    }

    const [updated] = await db
      .update(ticketViews)
      .set({ isDefault: true })
      .where(eq(ticketViews.id, input.id))
      .returning();
    return updated;
  }),
};
