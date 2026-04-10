import { Worker, Job } from "bullmq";
import { db } from "@ticket-app/db";
import { workflows, workflowExecutionLogs } from "@ticket-app/db/schema/_workflows";
import { tickets } from "@ticket-app/db/schema/_tickets";
import { workflowEngine } from "../services/workflowEngine";
import { workflowActions } from "../services/workflowActions";
import { eq, and } from "drizzle-orm";
import { addWorkflowJob, type WorkflowJobData } from "@ticket-app/db/lib/queues";

export async function executeWorkflow(job: Job<WorkflowJobData>): Promise<void> {
  const { workflowId, triggerType, entityType, entityId, payload } = job.data;
  const startTime = Date.now();

  try {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, Number(workflowId)), eq(workflows.isActive, true)));

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found or inactive`);
    }

    if (entityType !== "ticket") {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }

    const ticketId = Number(entityId);
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const ticketData = ticket as Record<string, unknown>;

    const conditionsResult = workflowEngine.evaluateConditions(
      workflow.conditions as { operator: "and" | "or"; rules: any[] },
      ticketData,
    );

    await db.insert(workflowExecutionLogs).values({
      workflowId: workflow.id,
      ticketId,
      trigger: triggerType,
      conditionsResult,
      actionsResult: null,
      durationMs: Date.now() - startTime,
    });

    if (!conditionsResult.passed) {
      return;
    }

    const loopDetected = await workflowEngine.detectLoop(workflow.id, ticketId);

    if (loopDetected) {
      await db.insert(workflowExecutionLogs).values({
        workflowId: workflow.id,
        ticketId,
        trigger: triggerType,
        conditionsResult,
        actionsResult: { error: "Circular loop detected" },
        error: "Circular workflow loop detected and stopped",
        durationMs: Date.now() - startTime,
      });
      return;
    }

    const actionsResult = await workflowActions.executeActions(
      workflow.actions as any[],
      ticketData,
      { workflowId: workflow.id, ticketId },
    );

    await db.insert(workflowExecutionLogs).values({
      workflowId: workflow.id,
      ticketId,
      trigger: triggerType,
      conditionsResult,
      actionsResult,
      durationMs: Date.now() - startTime,
    });

    if (payload?.triggeredActions) {
      for (const action of workflow.actions as any[]) {
        if (action.type === "assign_agent" || action.type === "assign_team") {
          await addWorkflowJob({
            workflowId: String(workflow.id),
            triggerType: "ticket_updated",
            entityType: "ticket",
            entityId: String(ticketId),
          });
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db.insert(workflowExecutionLogs).values({
      workflowId: Number(workflowId),
      ticketId: Number(entityId),
      trigger: triggerType,
      conditionsResult: null,
      actionsResult: null,
      error: errorMessage,
      durationMs: Date.now() - startTime,
    });

    throw error;
  }
}

export function createWorkflowWorker() {
  return new Worker<WorkflowJobData>("workflow", executeWorkflow, {
    connection: getRedis(),
    concurrency: 5,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  });
}

export { Job };
