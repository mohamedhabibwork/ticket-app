import { db } from "@ticket-app/db";
import { ticketCategories } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const ticketCategoriesRouter = {
  list: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(ticketCategories)
        .where(eq(ticketCategories.organizationId, input.organizationId))
        .orderBy(desc(ticketCategories.createdAt));
    }),

  get: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [category] = await db
      .select()
      .from(ticketCategories)
      .where(eq(ticketCategories.id, input.id));
    return category ?? null;
  }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        slaPolicyId: z.number().optional(),
        teamId: z.number().optional(),
        priorityId: z.number().optional(),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [category] = await db
        .insert(ticketCategories)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          slaPolicyId: input.slaPolicyId,
          teamId: input.teamId,
          priorityId: input.priorityId,
          createdBy: input.createdBy,
        })
        .returning();
      return category;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        slaPolicyId: z.number().nullable().optional(),
        teamId: z.number().nullable().optional(),
        priorityId: z.number().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(ticketCategories)
        .set({
          name: input.name,
          description: input.description,
          slaPolicyId: input.slaPolicyId,
          teamId: input.teamId,
          priorityId: input.priorityId,
          isActive: input.isActive,
        })
        .where(eq(ticketCategories.id, input.id))
        .returning();
      return updated;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(ticketCategories).where(eq(ticketCategories.id, input.id));
    return { success: true };
  }),
};
