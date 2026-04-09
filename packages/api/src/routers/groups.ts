import { db } from "@ticket-app/db";
import { groups } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const groupsRouter = {
  list: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(groups)
        .where(eq(groups.organizationId, input.organizationId))
        .orderBy(desc(groups.createdAt));
    }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.id, input.id));
      return group ?? null;
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(150),
        description: z.string().optional(),
        parentId: z.number().optional(),
        createdBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [group] = await db
        .insert(groups)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          parentId: input.parentId,
          createdBy: input.createdBy,
        })
        .returning();
      return group;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(150).optional(),
        description: z.string().optional(),
        parentId: z.number().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(groups)
        .set({
          name: input.name,
          description: input.description,
          parentId: input.parentId,
          isActive: input.isActive,
        })
        .where(eq(groups.id, input.id))
        .returning();
      return updated;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      await db.delete(groups).where(eq(groups.id, input.id));
      return { success: true };
    }),
};
