import { eq, and, desc } from "drizzle-orm";
import * as z from "zod";
import { db } from "@ticket-app/db";
import { workflows, workflowExecutionLogs } from "@ticket-app/db/schema/_workflows";
import { workflowEngine } from "../services/workflowEngine";
import { workflowActions } from "../services/workflowActions";
import { publicProcedure } from "..";

const workflowConditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "greater_than",
    "less_than",
    "is_empty",
    "is_not_empty",
    "in",
    "not_in",
  ]),
  value: z.unknown(),
});

const workflowActionSchema = z.object({
  type: z.enum([
    "assign_agent",
    "assign_team",
    "set_priority",
    "set_status",
    "add_tags",
    "remove_tags",
    "send_email",
    "send_webhook",
    "create_task",
    "add_note",
    "apply_saved_reply",
    "create_calendar_event",
  ]),
  params: z.record(z.string(), z.unknown()),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  trigger: z.enum([
    "ticket_created",
    "ticket_updated",
    "ticket_status_changed",
    "ticket_priority_changed",
    "ticket_assigned",
    "sla_breached",
    "time_elapsed",
  ]),
  conditions: z.object({
    operator: z.enum(["and", "or"]).default("and"),
    rules: z.array(workflowConditionSchema),
  }),
  actions: z.array(workflowActionSchema),
  isActive: z.coerce.boolean().default(true),
});

const updateWorkflowSchema = createWorkflowSchema.partial();

const _conditionEvaluator = (
  ticket: Record<string, unknown>,
  condition: z.infer<typeof workflowConditionSchema>,
): boolean => {
  const fieldValue = ticket[condition.field];

  switch (condition.operator) {
    case "equals":
      return fieldValue === condition.value;
    case "not_equals":
      return fieldValue !== condition.value;
    case "contains":
      return typeof fieldValue === "string" && fieldValue.includes(String(condition.value));
    case "not_contains":
      return typeof fieldValue === "string" && !fieldValue.includes(String(condition.value));
    case "greater_than":
      return Number(fieldValue) > Number(condition.value);
    case "less_than":
      return Number(fieldValue) < Number(condition.value);
    case "is_empty":
      return fieldValue === null || fieldValue === undefined || fieldValue === "";
    case "is_not_empty":
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== "";
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case "not_in":
      return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
    default:
      return false;
  }
};

export const workflowsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        isActive: z.coerce.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [eq(workflows.organizationId, input.organizationId)];

      if (input.isActive !== undefined) {
        conditions.push(eq(workflows.isActive, input.isActive));
      }

      return await db
        .select()
        .from(workflows)
        .where(and(...conditions))
        .orderBy(desc(workflows.createdAt));
    }),

  get: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, input.id), eq(workflows.organizationId, input.organizationId)));
      return workflow || null;
    }),

  create: publicProcedure
    .input(createWorkflowSchema.extend({ organizationId: z.coerce.number() }))
    .handler(async ({ input }) => {
      const { organizationId, ...rest } = input;

      const [workflow] = await db
        .insert(workflows)
        .values({
          organizationId,
          name: rest.name,
          description: rest.description,
          trigger: rest.trigger,
          conditions: rest.conditions,
          actions: rest.actions,
          isActive: rest.isActive,
        })
        .returning();

      return workflow;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        data: updateWorkflowSchema,
      }),
    )
    .handler(async ({ input }) => {
      const [workflow] = await db
        .update(workflows)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(and(eq(workflows.id, input.id), eq(workflows.organizationId, input.organizationId)))
        .returning();

      return workflow;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(workflows)
        .set({ deletedAt: new Date() })
        .where(and(eq(workflows.id, input.id), eq(workflows.organizationId, input.organizationId)));
      return { success: true };
    }),

  toggleActive: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        isActive: z.coerce.boolean(),
      }),
    )
    .handler(async ({ input }) => {
      const [workflow] = await db
        .update(workflows)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(and(eq(workflows.id, input.id), eq(workflows.organizationId, input.organizationId)))
        .returning();

      return workflow;
    }),

  execute: publicProcedure
    .input(
      z.object({
        workflowId: z.coerce.number(),
        ticketId: z.coerce.number(),
        triggerType: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const startTime = Date.now();

      try {
        const [workflow] = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, input.workflowId));

        if (!workflow || !workflow.isActive) {
          return { success: false, error: "Workflow not found or inactive" };
        }

        const [ticket] = await db
          .select()
          .from(/* tickets */ {} as any)
          .where(eq(/* tickets.id */ input.ticketId as any, input.ticketId));

        if (!ticket) {
          return { success: false, error: "Ticket not found" };
        }

        const ticketData = ticket as Record<string, unknown>;

        const conditionsResult = workflowEngine.evaluateConditions(
          workflow.conditions as { operator: "and" | "or"; rules: any[] },
          ticketData,
        );

        if (!conditionsResult.passed) {
          await db.insert(workflowExecutionLogs).values({
            workflowId: workflow.id,
            ticketId: input.ticketId,
            trigger: input.triggerType,
            conditionsResult,
            actionsResult: null,
            durationMs: Date.now() - startTime,
          });

          return { success: true, skipped: true, reason: "Conditions not met" };
        }

        const loopDetected = await workflowEngine.detectLoop(workflow.id, input.ticketId);

        if (loopDetected) {
          await db.insert(workflowExecutionLogs).values({
            workflowId: workflow.id,
            ticketId: input.ticketId,
            trigger: input.triggerType,
            conditionsResult,
            actionsResult: { error: "Circular loop detected" },
            error: "Circular workflow loop detected and stopped",
            durationMs: Date.now() - startTime,
          });

          return { success: false, error: "Circular loop detected" };
        }

        const actionsResult = await workflowActions.executeActions(
          workflow.actions as any[],
          ticketData,
          { workflowId: workflow.id, ticketId: input.ticketId },
        );

        await db.insert(workflowExecutionLogs).values({
          workflowId: workflow.id,
          ticketId: input.ticketId,
          trigger: input.triggerType,
          conditionsResult,
          actionsResult,
          durationMs: Date.now() - startTime,
        });

        return { success: true, actionsResult };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        await db.insert(workflowExecutionLogs).values({
          workflowId: input.workflowId,
          ticketId: input.ticketId,
          trigger: input.triggerType,
          conditionsResult: null,
          actionsResult: null,
          error: errorMessage,
          durationMs: Date.now() - startTime,
        });

        return { success: false, error: errorMessage };
      }
    }),

  simulate: publicProcedure
    .input(
      z.object({
        workflowId: z.coerce.number(),
        organizationId: z.coerce.number(),
        testData: z.object({
          ticketId: z.coerce.number().optional(),
          ticketData: z.record(z.string(), z.unknown()).optional(),
        }),
      }),
    )
    .handler(async ({ input }) => {
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(
          and(
            eq(workflows.id, input.workflowId),
            eq(workflows.organizationId, input.organizationId),
          ),
        );

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      const testTicketData = input.testData.ticketData ?? {
        id: input.testData.ticketId ?? 0,
        subject: "Test Ticket",
        status: "open",
        priority: "medium",
      };

      const conditionsResult = workflowEngine.evaluateConditions(
        workflow.conditions as { operator: "and" | "or"; rules: any[] },
        testTicketData as Record<string, unknown>,
      );

      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        conditionsResult,
        wouldExecute: conditionsResult.passed,
        testData: testTicketData,
      };
    }),

  getExecutionLogs: publicProcedure
    .input(
      z.object({
        workflowId: z.coerce.number(),
        organizationId: z.coerce.number(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(
          and(
            eq(workflows.id, input.workflowId),
            eq(workflows.organizationId, input.organizationId),
          ),
        );

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      return await db
        .select()
        .from(workflowExecutionLogs)
        .where(eq(workflowExecutionLogs.workflowId, input.workflowId))
        .orderBy(desc(workflowExecutionLogs.executedAt))
        .limit(input.limit)
        .offset(input.offset);
    }),
};
