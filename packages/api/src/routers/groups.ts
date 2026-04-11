import { db } from "@ticket-app/db";
import { groups } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";

export const groupsRouter = {
  list: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.GROUPS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Groups read permission required");
      }

      return await db
        .select()
        .from(groups)
        .where(eq(groups.organizationId, input.organizationId))
        .orderBy(desc(groups.createdAt));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.GROUPS, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Groups read permission required");
      }

      const [group] = await db.select().from(groups).where(eq(groups.id, input.id));
      return group ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(150),
        description: z.string().optional(),
        parentId: z.coerce.number().optional(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.GROUPS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Groups write permission required");
      }

      const [group] = await db
        .insert(groups)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          createdBy: input.createdBy,
        })
        .returning();
      return group;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        name: z.string().min(1).max(150).optional(),
        description: z.string().optional(),
        parentId: z.coerce.number().nullable().optional(),
        isActive: z.coerce.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.GROUPS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Groups write permission required");
      }

      const [updated] = await db
        .update(groups)
        .set({
          name: input.name,
          description: input.description,
          isActive: input.isActive,
        })
        .where(eq(groups.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth!.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.GROUPS, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Groups write permission required");
      }

      await db.delete(groups).where(eq(groups.id, input.id));
      return { success: true };
    }),
};
