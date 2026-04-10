import { db } from "@ticket-app/db";
import { tasks, taskAssignees, taskChecklistItems, lookups } from "@ticket-app/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const tasksRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        ticketId: z.coerce.number().optional(),
        statusId: z.coerce.number().optional(),
        priorityId: z.coerce.number().optional(),
        assignedUserId: z.coerce.number().optional(),
        search: z.string().optional(),
        includeCompleted: z.coerce.boolean().default(true),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [eq(tasks.organizationId, input.organizationId), isNull(tasks.deletedAt)];

      if (input.ticketId) conditions.push(eq(tasks.ticketId, input.ticketId));
      if (input.statusId) conditions.push(eq(tasks.statusId, input.statusId));
      if (input.priorityId) conditions.push(eq(tasks.priorityId, input.priorityId));
      if (!input.includeCompleted) {
        conditions.push(isNull(tasks.completedAt));
      }

      return await db.query.tasks.findMany({
        where: and(...conditions),
        orderBy: [desc(tasks.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          status: true,
          priority: true,
          assignees: {
            with: {
              user: {
                columns: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          checklistItems: true,
        },
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, input.id),
          eq(tasks.organizationId, input.organizationId),
          isNull(tasks.deletedAt),
        ),
        with: {
          status: true,
          priority: true,
          ticket: {
            with: {
              contact: true,
              status: true,
            },
          },
          assignees: {
            with: {
              user: {
                columns: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          checklistItems: true,
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        ticketId: z.coerce.number().optional(),
        statusId: z.coerce.number(),
        priorityId: z.coerce.number().optional(),
        dueAt: z.date().optional(),
        assignedUserIds: z.array(z.coerce.number()).optional(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const defaultStatusId =
        input.statusId ||
        (
          await db.query.lookups.findFirst({
            where: and(
              eq(
                lookups.lookupTypeId,
                sql`(SELECT id FROM lookup_types WHERE name = 'task_status')`,
              ),
              eq(lookups.isDefault, true),
            ),
          })
        )?.id;

      const [task] = await db
        .insert(tasks)
        .values({
          organizationId: input.organizationId,
          ticketId: input.ticketId,
          title: input.title,
          description: input.description,
          statusId: defaultStatusId as any,
          priorityId: input.priorityId,
          dueAt: input.dueAt,
          createdBy: input.createdBy,
        })
        .returning();

      if (input.assignedUserIds && input.assignedUserIds.length > 0) {
        await db.insert(taskAssignees).values(
          input.assignedUserIds.map((userId) => ({
            taskId: (task as any).id,
            userId,
          })),
        );
      }

      return task;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        statusId: z.coerce.number().optional(),
        priorityId: z.coerce.number().optional(),
        dueAt: z.date().nullable().optional(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      };

      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.statusId !== undefined) updates.statusId = input.statusId;
      if (input.priorityId !== undefined) updates.priorityId = input.priorityId;
      if (input.dueAt !== undefined) updates.dueAt = input.dueAt;

      const [updated] = await db
        .update(tasks)
        .set(updates)
        .where(and(eq(tasks.id, input.id), eq(tasks.organizationId, input.organizationId)))
        .returning();

      return updated;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        deletedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(tasks)
        .set({
          deletedAt: new Date(),
          deletedBy: input.deletedBy,
        })
        .where(and(eq(tasks.id, input.id), eq(tasks.organizationId, input.organizationId)));

      return { success: true };
    }),

  assign: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        userId: z.coerce.number(),
        assignedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [assignee] = await db
        .insert(taskAssignees)
        .values({
          taskId: input.id,
          userId: input.userId,
        })
        .onConflictDoNothing()
        .returning();

      return assignee;
    }),

  complete: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        completedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(tasks)
        .set({
          completedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: input.completedBy,
        })
        .where(and(eq(tasks.id, input.id), eq(tasks.organizationId, input.organizationId)))
        .returning();

      return updated;
    }),

  addComment: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        content: z.string().min(1),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async () => {
      return { success: true, message: "Comments feature requires task_comments table" };
    }),

  getSubtasks: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.taskChecklistItems.findMany({
        where: eq(taskChecklistItems.taskId, input.id),
        orderBy: [taskChecklistItems.orderBy],
      });
    }),

  createSubtask: publicProcedure
    .input(
      z.object({
        taskId: z.coerce.number(),
        title: z.string().min(1).max(255),
        orderBy: z.coerce.number().default(0),
      }),
    )
    .handler(async ({ input }) => {
      const [item] = await db
        .insert(taskChecklistItems)
        .values({
          taskId: input.taskId,
          title: input.title,
          orderBy: input.orderBy,
        })
        .returning();

      return item;
    }),
};
