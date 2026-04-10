import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import * as z from "zod";
import { db } from "@ticket-app/db";
import { workflowExecutionLogs, workflows } from "@ticket-app/db/schema/_workflows";
import { publicProcedure } from "..";

const listLogsSchema = z.object({
  organizationId: z.coerce.number(),
  workflowId: z.coerce.number().optional(),
  ticketId: z.coerce.number().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const workflowLogsRouter = {
  list: publicProcedure.input(listLogsSchema).handler(async ({ input }) => {
    const _conditions = [eq(workflows.organizationId, input.organizationId)];

    let logs;

    if (input.workflowId) {
      logs = await db
        .select({
          id: workflowExecutionLogs.id,
          uuid: workflowExecutionLogs.uuid,
          workflowId: workflowExecutionLogs.workflowId,
          ticketId: workflowExecutionLogs.ticketId,
          executedAt: workflowExecutionLogs.executedAt,
          trigger: workflowExecutionLogs.trigger,
          conditionsResult: workflowExecutionLogs.conditionsResult,
          actionsResult: workflowExecutionLogs.actionsResult,
          error: workflowExecutionLogs.error,
          durationMs: workflowExecutionLogs.durationMs,
          workflowName: workflows.name,
        })
        .from(workflowExecutionLogs)
        .innerJoin(workflows, eq(workflowExecutionLogs.workflowId, workflows.id))
        .where(
          and(
            eq(workflowExecutionLogs.workflowId, input.workflowId),
            eq(workflows.organizationId, input.organizationId),
          ),
        )
        .orderBy(desc(workflowExecutionLogs.executedAt))
        .limit(input.limit)
        .offset(input.offset);
    } else {
      const baseQuery = db
        .select({
          id: workflowExecutionLogs.id,
          uuid: workflowExecutionLogs.uuid,
          workflowId: workflowExecutionLogs.workflowId,
          ticketId: workflowExecutionLogs.ticketId,
          executedAt: workflowExecutionLogs.executedAt,
          trigger: workflowExecutionLogs.trigger,
          conditionsResult: workflowExecutionLogs.conditionsResult,
          actionsResult: workflowExecutionLogs.actionsResult,
          error: workflowExecutionLogs.error,
          durationMs: workflowExecutionLogs.durationMs,
          workflowName: workflows.name,
        })
        .from(workflowExecutionLogs)
        .innerJoin(workflows, eq(workflowExecutionLogs.workflowId, workflows.id))
        .where(eq(workflows.organizationId, input.organizationId))
        .orderBy(desc(workflowExecutionLogs.executedAt))
        .limit(input.limit)
        .offset(input.offset);

      logs = await baseQuery;
    }

    return logs;
  }),

  get: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [log] = await db
        .select({
          id: workflowExecutionLogs.id,
          uuid: workflowExecutionLogs.uuid,
          workflowId: workflowExecutionLogs.workflowId,
          ticketId: workflowExecutionLogs.ticketId,
          executedAt: workflowExecutionLogs.executedAt,
          trigger: workflowExecutionLogs.trigger,
          conditionsResult: workflowExecutionLogs.conditionsResult,
          actionsResult: workflowExecutionLogs.actionsResult,
          error: workflowExecutionLogs.error,
          durationMs: workflowExecutionLogs.durationMs,
          createdAt: workflowExecutionLogs.createdAt,
          workflowName: workflows.name,
          workflowDescription: workflows.description,
        })
        .from(workflowExecutionLogs)
        .innerJoin(workflows, eq(workflowExecutionLogs.workflowId, workflows.id))
        .where(
          and(
            eq(workflowExecutionLogs.id, input.id),
            eq(workflows.organizationId, input.organizationId),
          ),
        );

      return log || null;
    }),

  getByTicket: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        organizationId: z.coerce.number(),
        limit: z.coerce.number().min(1).max(100).default(50),
      }),
    )
    .handler(async ({ input }) => {
      const logs = await db
        .select({
          id: workflowExecutionLogs.id,
          uuid: workflowExecutionLogs.uuid,
          workflowId: workflowExecutionLogs.workflowId,
          ticketId: workflowExecutionLogs.ticketId,
          executedAt: workflowExecutionLogs.executedAt,
          trigger: workflowExecutionLogs.trigger,
          conditionsResult: workflowExecutionLogs.conditionsResult,
          actionsResult: workflowExecutionLogs.actionsResult,
          error: workflowExecutionLogs.error,
          durationMs: workflowExecutionLogs.durationMs,
          workflowName: workflows.name,
        })
        .from(workflowExecutionLogs)
        .innerJoin(workflows, eq(workflowExecutionLogs.workflowId, workflows.id))
        .where(
          and(
            eq(workflowExecutionLogs.ticketId, input.ticketId),
            eq(workflows.organizationId, input.organizationId),
          ),
        )
        .orderBy(desc(workflowExecutionLogs.executedAt))
        .limit(input.limit);

      return logs;
    }),

  getStats: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        workflowId: z.coerce.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [eq(workflows.organizationId, input.organizationId)];

      if (input.workflowId) {
        conditions.push(eq(workflowExecutionLogs.workflowId, input.workflowId));
      }

      if (input.startDate) {
        conditions.push(gte(workflowExecutionLogs.executedAt, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(workflowExecutionLogs.executedAt, input.endDate));
      }

      const stats = await db
        .select({
          totalExecutions: sql<number>`count(*)::int`,
          successfulExecutions: sql<number>`count(*) filter (where ${workflowExecutionLogs.error} is null)::int`,
          failedExecutions: sql<number>`count(*) filter (where ${workflowExecutionLogs.error} is not null)::int`,
          avgDurationMs: sql<number>`coalesce(avg(${workflowExecutionLogs.durationMs}), 0)::int`,
        })
        .from(workflowExecutionLogs)
        .innerJoin(workflows, eq(workflowExecutionLogs.workflowId, workflows.id))
        .where(and(...conditions));

      return (
        stats[0] || {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          avgDurationMs: 0,
        }
      );
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [log] = await db
        .select()
        .from(workflowExecutionLogs)
        .innerJoin(workflows, eq(workflowExecutionLogs.workflowId, workflows.id))
        .where(
          and(
            eq(workflowExecutionLogs.id, input.id),
            eq(workflows.organizationId, input.organizationId),
          ),
        );

      if (!log) {
        return { success: false, error: "Log not found" };
      }

      await db.delete(workflowExecutionLogs).where(eq(workflowExecutionLogs.id, input.id));

      return { success: true };
    }),

  deleteOld: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        olderThanDays: z.coerce.number().min(1).max(365),
      }),
    )
    .handler(async ({ input }) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays);

      const result = await db.delete(workflowExecutionLogs).where(
        and(
          sql`${workflowExecutionLogs.executedAt} < ${cutoffDate}`,
          sql`${workflowExecutionLogs.workflowId} in (
            select id from workflows where organization_id = ${input.organizationId}
          )`,
        ),
      );

      return { success: true, deletedCount: result.rowCount };
    }),
};
