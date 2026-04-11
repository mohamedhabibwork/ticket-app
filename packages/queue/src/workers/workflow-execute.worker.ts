import { Worker, Job, Queue } from "bullmq";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@ticket-app/db";
import {
  workflows,
  workflowExecutionLogs,
  tickets,
  ticketTags,
  tags,
  ticketMessages,
} from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";
import { addEmailSendJob, type EmailSendJobData } from "./email-send.worker";
import { publishTicketUpdated, publishTicketAssigned } from "../socket-publish";

const WORKFLOW_EXECUTE_QUEUE = `${env.QUEUE_PREFIX}-workflow-execute`;

export interface WorkflowExecuteJobData {
  type: "execute-workflow" | "execute-ticket-trigger";
  workflowId?: number;
  ticketId?: number;
  trigger: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowCondition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty";
  value: string | number | boolean;
}

export interface WorkflowConditions {
  operator: "AND" | "OR";
  conditions: WorkflowCondition[];
}

export interface WorkflowAction {
  type:
    | "assign_agent"
    | "assign_team"
    | "set_priority"
    | "set_status"
    | "add_tag"
    | "remove_tag"
    | "send_email"
    | "webhook"
    | "create_task"
    | "add_note"
    | "apply_saved_reply"
    | "stop_processing";
  config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  name: string;
  trigger: string;
  conditions: WorkflowConditions;
  actions: WorkflowAction[];
  isActive: boolean;
}

interface TicketData {
  id: number;
  uuid: string;
  referenceNumber: string;
  subject: string;
  descriptionHtml: string | null;
  statusId: number;
  priorityId: number;
  channelId: number | null;
  contactId: number | null;
  assignedAgentId: number | null;
  assignedTeamId: number | null;
  mailboxId: number | null;
  isSpam: boolean;
  isLocked: boolean;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  dueAt: Date | null;
  createdAt: Date;
  organizationId: number;
  [key: string]: unknown;
}

const workflowExecuteQueue = new Queue<WorkflowExecuteJobData>(WORKFLOW_EXECUTE_QUEUE, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

const MAX_RETRIGGER_DEPTH = 1;
const processedWorkflowTickets = new Map<string, number>();

export async function addWorkflowExecuteJob(
  data: WorkflowExecuteJobData,
  options?: { delay?: number },
): Promise<Job<WorkflowExecuteJobData>> {
  return workflowExecuteQueue.add("workflow-execute", data, {
    ...options,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export function createWorkflowExecuteWorker(): Worker {
  return new Worker(
    WORKFLOW_EXECUTE_QUEUE,
    async (job: Job<WorkflowExecuteJobData>) => {
      const { type, workflowId, ticketId, trigger, metadata } = job.data;

      switch (type) {
        case "execute-workflow":
          if (workflowId && ticketId) {
            await executeWorkflow(workflowId, ticketId, trigger, metadata);
          }
          break;
        case "execute-ticket-trigger":
          if (ticketId) {
            await executeTicketTriggers(ticketId, trigger, metadata);
          }
          break;
      }
    },
    {
      connection: getRedis(),
      concurrency: 5,
    },
  );
}

export async function executeTicketTriggers(
  ticketId: number,
  trigger: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  console.log(`[Workflow] Executing triggers for ticket ${ticketId}, trigger: ${trigger}`);

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    with: {
      contact: true,
      assignedAgent: true,
      assignedTeam: true,
      priority: true,
      status: true,
      tags: {
        with: { tag: true },
      },
    },
  });

  if (!ticket) {
    console.error(`[Workflow] Ticket ${ticketId} not found`);
    return;
  }

  const activeWorkflows = await db.query.workflows.findMany({
    where: and(
      eq(workflows.isActive, true),
      eq(workflows.trigger, trigger),
      isNull(workflows.deletedAt),
    ),
    orderBy: [desc(workflows.createdAt)],
  });

  let stopProcessing = false;

  for (const workflow of activeWorkflows) {
    if (stopProcessing) {
      console.log(`[Workflow] Stopping processing after workflow ${workflow.id}`);
      break;
    }

    try {
      const result = await executeWorkflow(workflow.id, ticketId, trigger, metadata);

      if (result?.stopProcessing) {
        stopProcessing = true;
      }
    } catch (error) {
      console.error(`[Workflow] Error executing workflow ${workflow.id}:`, error);
    }
  }
}

async function executeWorkflow(
  workflowId: number,
  ticketId: number,
  trigger: string,
  _metadata?: Record<string, unknown>,
): Promise<{ success: boolean; stopProcessing?: boolean }> {
  const startTime = Date.now();

  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.id, workflowId),
  });

  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found`);
  }

  if (!workflow.isActive) {
    console.log(`[Workflow] Workflow ${workflowId} is inactive, skipping`);
    return { success: false };
  }

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    with: {
      contact: true,
      assignedAgent: true,
      assignedTeam: true,
      priority: true,
      status: true,
      tags: {
        with: { tag: true },
      },
      customFieldValues: true,
    },
  });

  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  const workflowKey = `${workflowId}-${ticketId}`;
  const currentRetriggers = processedWorkflowTickets.get(workflowKey) || 0;

  if (currentRetriggers >= MAX_RETRIGGER_DEPTH) {
    console.log(
      `[Workflow] Circular loop prevented for workflow ${workflowId}, ticket ${ticketId}`,
    );
    await logWorkflowExecution({
      workflowId,
      ticketId,
      trigger,
      conditionsResult: { skipped: true, reason: "max_retrigger_depth_exceeded" },
      actionsResult: null,
      error: "Max re-trigger depth exceeded",
      durationMs: Date.now() - startTime,
    });
    return { success: false };
  }

  processedWorkflowTickets.set(workflowKey, currentRetriggers + 1);

  const conditions = workflow.conditions as WorkflowConditions;
  const conditionsResult = evaluateConditions(conditions, ticket);

  if (!conditionsResult.passed) {
    console.log(`[Workflow] Conditions not met for workflow ${workflowId}, ticket ${ticketId}`);
    await logWorkflowExecution({
      workflowId,
      ticketId,
      trigger,
      conditionsResult,
      actionsResult: null,
      error: null,
      durationMs: Date.now() - startTime,
    });
    return { success: true };
  }

  const actions = workflow.actions as WorkflowAction[];
  const actionsResult = await executeActions(actions, ticket, workflowId);

  const stopProcessing = actionsResult.some((a) => a.type === "stop_processing");

  await logWorkflowExecution({
    workflowId,
    ticketId,
    trigger,
    conditionsResult,
    actionsResult,
    error: null,
    durationMs: Date.now() - startTime,
  });

  console.log(
    `[Workflow] Workflow ${workflowId} executed for ticket ${ticketId}, duration: ${Date.now() - startTime}ms`,
  );

  return { success: true, stopProcessing };
}

function evaluateConditions(
  conditions: WorkflowConditions,
  ticket: TicketData,
): { passed: boolean; results: Record<string, boolean> } {
  const results: Record<string, boolean> = {};

  for (const condition of conditions.conditions) {
    const fieldValue = getFieldValue(ticket, condition.field);
    results[condition.field] = evaluateCondition(fieldValue, condition);
  }

  let passed: boolean;
  if (conditions.operator === "AND") {
    passed = Object.values(results).every((r) => r);
  } else {
    passed = Object.values(results).some((r) => r);
  }

  return { passed, results };
}

function getFieldValue(ticket: TicketData, field: string): unknown {
  const fieldMap: Record<string, string> = {
    ticket_id: "id",
    ticket_uuid: "uuid",
    ticket_reference: "referenceNumber",
    ticket_subject: "subject",
    ticket_status: "statusId",
    ticket_priority: "priorityId",
    ticket_channel: "channelId",
    ticket_contact: "contactId",
    ticket_agent: "assignedAgentId",
    ticket_team: "assignedTeamId",
    ticket_mailbox: "mailboxId",
    ticket_is_spam: "isSpam",
    ticket_is_locked: "isLocked",
    ticket_has_due_date: "dueAt",
    ticket_created_at: "createdAt",
    ticket_resolved_at: "resolvedAt",
    ticket_closed_at: "closedAt",
    ticket_first_response: "firstResponseAt",
  };

  const mappedField = fieldMap[field] || field;
  return (ticket as Record<string, unknown>)[mappedField];
}

function evaluateCondition(fieldValue: unknown, condition: WorkflowCondition): boolean {
  const { operator, value } = condition;

  switch (operator) {
    case "equals":
      return fieldValue === value;
    case "not_equals":
      return fieldValue !== value;
    case "contains":
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case "not_contains":
      return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case "greater_than":
      return Number(fieldValue) > Number(value);
    case "less_than":
      return Number(fieldValue) < Number(value);
    case "is_empty":
      return fieldValue === null || fieldValue === undefined || fieldValue === "";
    case "is_not_empty":
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== "";
    default:
      return false;
  }
}

async function executeActions(
  actions: WorkflowAction[],
  ticket: TicketData,
  workflowId: number,
): Promise<{ type: string; success: boolean; error?: string }[]> {
  const results: { type: string; success: boolean; error?: string }[] = [];

  for (const action of actions) {
    try {
      let success = false;

      switch (action.type) {
        case "assign_agent":
          await executeAssignAgent(action, ticket);
          success = true;
          break;

        case "assign_team":
          await executeAssignTeam(action, ticket);
          success = true;
          break;

        case "set_priority":
          await executeSetPriority(action, ticket);
          success = true;
          break;

        case "set_status":
          await executeSetStatus(action, ticket);
          success = true;
          break;

        case "add_tag":
          await executeAddTag(action, ticket);
          success = true;
          break;

        case "remove_tag":
          await executeRemoveTag(action, ticket);
          success = true;
          break;

        case "send_email":
          await executeSendEmail(action, ticket);
          success = true;
          break;

        case "webhook":
          await executeWebhook(action, ticket, workflowId);
          success = true;
          break;

        case "create_task":
          await executeCreateTask(action, ticket);
          success = true;
          break;

        case "add_note":
          await executeAddNote(action, ticket);
          success = true;
          break;

        case "apply_saved_reply":
          await executeApplySavedReply(action, ticket);
          success = true;
          break;

        case "stop_processing":
          success = true;
          break;

        default:
          console.warn(`[Workflow] Unknown action type: ${action.type}`);
      }

      results.push({ type: action.type, success });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Workflow] Error executing action ${action.type}:`, error);
      results.push({ type: action.type, success: false, error: errorMessage });
    }
  }

  return results;
}

async function executeAssignAgent(action: WorkflowAction, ticket: TicketData): Promise<void> {
  const agentId = action.config.agentId as number;
  console.log(`[Workflow] Assigning agent ${agentId} to ticket ${ticket.id}`);

  await db.update(tickets).set({ assignedAgentId: agentId }).where(eq(tickets.id, ticket.id));

  publishTicketAssigned(ticket.id, ticket.organizationId, agentId, ticket.assignedTeamId, {
    previousAgentId: ticket.assignedAgentId,
    newAgentId: agentId,
    assignedBy: "workflow",
  }).catch((err) => {
    console.error("[Workflow] Failed to publish ticket assigned event:", err);
  });
}

async function executeAssignTeam(action: WorkflowAction, ticket: TicketData): Promise<void> {
  const teamId = action.config.teamId as number;
  console.log(`[Workflow] Assigning team ${teamId} to ticket ${ticket.id}`);

  await db.update(tickets).set({ assignedTeamId: teamId }).where(eq(tickets.id, ticket.id));

  publishTicketAssigned(ticket.id, ticket.organizationId, ticket.assignedAgentId, teamId, {
    previousTeamId: ticket.assignedTeamId,
    newTeamId: teamId,
    assignedBy: "workflow",
  }).catch((err) => {
    console.error("[Workflow] Failed to publish ticket assigned event:", err);
  });
}

async function executeSetPriority(action: WorkflowAction, ticket: TicketData): Promise<void> {
  const priorityId = action.config.priorityId as number;
  console.log(`[Workflow] Setting priority ${priorityId} for ticket ${ticket.id}`);

  await db.update(tickets).set({ priorityId }).where(eq(tickets.id, ticket.id));

  publishTicketUpdated(ticket.id, ticket.organizationId, {
    previousPriorityId: ticket.priorityId,
    newPriorityId: priorityId,
    updatedBy: "workflow",
  }).catch((err) => {
    console.error("[Workflow] Failed to publish ticket updated event:", err);
  });
}

async function executeSetStatus(action: WorkflowAction, ticket: TicketData): Promise<void> {
  const statusId = action.config.statusId as number;
  console.log(`[Workflow] Setting status ${statusId} for ticket ${ticket.id}`);

  const updates: Partial<{ statusId: number; resolvedAt: Date; closedAt: Date }> = { statusId };

  if (action.config.resolvedAt) {
    updates.resolvedAt = new Date();
  }
  if (action.config.closedAt) {
    updates.closedAt = new Date();
  }

  await db.update(tickets).set(updates).where(eq(tickets.id, ticket.id));

  publishTicketUpdated(ticket.id, ticket.organizationId, {
    previousStatusId: ticket.statusId,
    newStatusId: statusId,
    updatedBy: "workflow",
  }).catch((err) => {
    console.error("[Workflow] Failed to publish ticket updated event:", err);
  });
}

async function executeAddTag(action: WorkflowAction, ticket: TicketData): Promise<void> {
  const tagName = action.config.tagName as string;
  console.log(`[Workflow] Adding tag "${tagName}" to ticket ${ticket.id}`);

  let tag = await db.query.tags.findFirst({
    where: and(eq(tags.name, tagName), eq(tags.organizationId, ticket.organizationId)),
  });

  if (!tag) {
    const [newTag] = await db
      .insert(tags)
      .values({ name: tagName, organizationId: ticket.organizationId })
      .returning();
    if (!newTag) {
      console.error(`[Workflow] Failed to create tag "${tagName}"`);
      return;
    }
    tag = newTag;
  }

  const existingTicketTag = await db.query.ticketTags.findFirst({
    where: and(eq(ticketTags.ticketId, ticket.id), eq(ticketTags.tagId, tag.id)),
  });

  if (!existingTicketTag) {
    await db.insert(ticketTags).values({ ticketId: ticket.id, tagId: tag.id });
  }
}

async function executeRemoveTag(action: WorkflowAction, ticket: TicketData): Promise<void> {
  const tagName = action.config.tagName as string;
  console.log(`[Workflow] Removing tag "${tagName}" from ticket ${ticket.id}`);

  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.name, tagName), eq(tags.organizationId, ticket.organizationId)),
  });

  if (tag) {
    await db
      .delete(ticketTags)
      .where(and(eq(ticketTags.ticketId, ticket.id), eq(ticketTags.tagId, tag.id)));
  }
}

async function executeSendEmail(action: WorkflowAction, ticket: TicketData): Promise<void> {
  const { to, subject, body } = action.config as {
    to: string;
    subject: string;
    body: string;
  };

  console.log(`[Workflow] Sending email for ticket ${ticket.id}`);

  const emailData: EmailSendJobData = {
    mailboxId: ticket.mailboxId || 1,
    toEmails: [to],
    subject: subject.replace("{{ticket.reference}}", ticket.referenceNumber),
    bodyHtml: body,
    ticketId: ticket.id,
    mergeTags: {
      ticket_reference: ticket.referenceNumber,
      ticket_subject: ticket.subject,
      ticket_status: String(ticket.statusId),
      ticket_priority: String(ticket.priorityId),
    },
  };

  await addEmailSendJob(emailData);
}

async function executeWebhook(
  action: WorkflowAction,
  ticket: TicketData,
  workflowId: number,
): Promise<void> {
  const { url, method, headers, bodyTemplate } = action.config as {
    url: string;
    method: string;
    headers?: Record<string, string>;
    bodyTemplate?: string;
  };

  console.log(`[Workflow] Sending webhook to ${url} for ticket ${ticket.id}`);

  const body = bodyTemplate
    ? bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) =>
        String((ticket as Record<string, unknown>)[key] || ""),
      )
    : JSON.stringify({ ticketId: ticket.id, workflowId, timestamp: new Date().toISOString() });

  try {
    const response = await fetch(url, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body,
    });

    if (!response.ok) {
      console.warn(`[Workflow] Webhook returned non-OK status: ${response.status}`);
    }
  } catch (error) {
    console.error(`[Workflow] Webhook error:`, error);
    throw error;
  }
}

async function executeCreateTask(action: WorkflowAction, ticket: TicketData): Promise<void> {
  const { title } = action.config as {
    title: string;
  };

  console.log(`[Workflow] Creating task for ticket ${ticket.id}`);

  console.log(`[Workflow] Task creation would create: ${title}`);
}

async function executeAddNote(action: WorkflowAction, ticket: TicketData): Promise<void> {
  const { content, isPrivate } = action.config as {
    content: string;
    isPrivate?: boolean;
  };

  console.log(`[Workflow] Adding note to ticket ${ticket.id}`);

  await db.insert(ticketMessages).values({
    ticketId: ticket.id,
    authorType: "system",
    messageType: "note",
    bodyHtml: content,
    bodyText: content,
    isPrivate: isPrivate || false,
  });
}

async function executeApplySavedReply(action: WorkflowAction, ticket: TicketData): Promise<void> {
  const { savedReplyId } = action.config as { savedReplyId: number };

  console.log(`[Workflow] Applying saved reply ${savedReplyId} to ticket ${ticket.id}`);
}

async function logWorkflowExecution(params: {
  workflowId: number;
  ticketId: number;
  trigger: string;
  conditionsResult: Record<string, unknown>;
  actionsResult: { type: string; success: boolean; error?: string }[] | null;
  error: string | null;
  durationMs: number;
}): Promise<void> {
  await db.insert(workflowExecutionLogs).values({
    workflowId: params.workflowId,
    ticketId: params.ticketId,
    trigger: params.trigger,
    conditionsResult: params.conditionsResult,
    actionsResult: params.actionsResult,
    error: params.error,
    durationMs: params.durationMs,
  });
}

export async function getWorkflowExecutionLogs(
  workflowId: number,
  limit: number = 50,
): Promise<(typeof workflowExecutionLogs.$inferSelect)[]> {
  const logs = await db.query.workflowExecutionLogs.findMany({
    where: eq(workflowExecutionLogs.workflowId, workflowId),
    orderBy: [desc(workflowExecutionLogs.executedAt)],
    limit,
  });
  return logs;
}

export async function closeWorkflowExecuteQueue(): Promise<void> {
  await workflowExecuteQueue.close();
}

export { Worker, Job, Queue };
