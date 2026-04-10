import { db } from "@ticket-app/db";
import { ticketCategories } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";

export const ticketCategoriesRouter = {
  list: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TICKET_CATEGORIES, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Ticket category read permission required");
      }

      return await db
        .select()
        .from(ticketCategories)
        .where(eq(ticketCategories.organizationId, input.organizationId))
        .orderBy(desc(ticketCategories.createdAt));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TICKET_CATEGORIES, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Ticket category read permission required");
      }

      const [category] = await db
        .select()
        .from(ticketCategories)
        .where(eq(ticketCategories.id, input.id));
      return category ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        slaPolicyId: z.coerce.number().optional(),
        teamId: z.coerce.number().optional(),
        priorityId: z.coerce.number().optional(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TICKET_CATEGORIES, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Ticket category write permission required");
      }

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
        } as any)
        .returning();
      return category;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        slaPolicyId: z.coerce.number().nullable().optional(),
        teamId: z.coerce.number().nullable().optional(),
        priorityId: z.coerce.number().nullable().optional(),
        isActive: z.coerce.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TICKET_CATEGORIES, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Ticket category write permission required");
      }

      const [updated] = await db
        .update(ticketCategories)
        .set({
          name: input.name,
          description: input.description,
          slaPolicyId: input.slaPolicyId,
          teamId: input.teamId,
          priorityId: input.priorityId,
          isActive: input.isActive,
        } as any)
        .where(eq(ticketCategories.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.TICKET_CATEGORIES, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Ticket category write permission required");
      }

      await db.delete(ticketCategories).where(eq(ticketCategories.id, input.id));
      return { success: true };
    }),
};
