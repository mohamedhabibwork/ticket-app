import { db } from "@ticket-app/db";
import { workflowExecutionLogs } from "@ticket-app/db/schema/_workflows";
import { eq, and, gte, sql } from "drizzle-orm";

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
    | "is_not_empty"
    | "in"
    | "not_in";
  value: unknown;
}

export interface WorkflowConditions {
  operator: "and" | "or";
  rules: WorkflowCondition[];
}

export interface ConditionEvaluationResult {
  passed: boolean;
  evaluatedRules: {
    rule: WorkflowCondition;
    result: boolean;
  }[];
}

const FIELD_VALUE_RESOLVERS: Record<string, (ticket: Record<string, unknown>) => unknown> = {
  status_id: (t) => t.statusId,
  priority_id: (t) => t.priorityId,
  channel_id: (t) => t.channelId,
  contact_id: (t) => t.contactId,
  assigned_agent_id: (t) => t.assignedAgentId,
  assigned_team_id: (t) => t.assignedTeamId,
  mailbox_id: (t) => t.mailboxId,
  is_spam: (t) => t.isSpam,
  is_locked: (t) => t.isLocked,
  subject: (t) => t.subject,
  description_html: (t) => t.descriptionHtml,
  reference_number: (t) => t.referenceNumber,
  created_at: (t) => t.createdAt,
  updated_at: (t) => t.updatedAt,
};

function resolveFieldValue(field: string, ticket: Record<string, unknown>): unknown {
  const resolver = FIELD_VALUE_RESOLVERS[field];
  if (resolver) {
    return resolver(ticket);
  }
  return ticket[field];
}

function evaluateCondition(condition: WorkflowCondition, ticket: Record<string, unknown>): boolean {
  const fieldValue = resolveFieldValue(condition.field, ticket);

  switch (condition.operator) {
    case "equals":
      return fieldValue === condition.value;

    case "not_equals":
      return fieldValue !== condition.value;

    case "contains":
      if (typeof fieldValue === "string" && typeof condition.value === "string") {
        return fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value);
      }
      return false;

    case "not_contains":
      if (typeof fieldValue === "string" && typeof condition.value === "string") {
        return !fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(condition.value);
      }
      return true;

    case "greater_than":
      return Number(fieldValue) > Number(condition.value);

    case "less_than":
      return Number(fieldValue) < Number(condition.value);

    case "is_empty":
      return (
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case "is_not_empty":
      return (
        fieldValue !== null &&
        fieldValue !== undefined &&
        fieldValue !== "" &&
        !(Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case "in":
      if (Array.isArray(condition.value)) {
        return condition.value.includes(fieldValue);
      }
      return false;

    case "not_in":
      if (Array.isArray(condition.value)) {
        return !condition.value.includes(fieldValue);
      }
      return true;

    default:
      return false;
  }
}

export const workflowEngine = {
  evaluateConditions(
    conditions: WorkflowConditions,
    ticket: Record<string, unknown>,
  ): ConditionEvaluationResult {
    const evaluatedRules = conditions.rules.map((rule) => ({
      rule,
      result: evaluateCondition(rule, ticket),
    }));

    let passed: boolean;
    if (conditions.operator === "and") {
      passed = evaluatedRules.every((r) => r.result);
    } else {
      passed = evaluatedRules.some((r) => r.result);
    }

    return { passed, evaluatedRules };
  },

  async detectLoop(workflowId: number, ticketId: number): Promise<boolean> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentExecutions = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(workflowExecutionLogs)
      .where(
        and(
          eq(workflowExecutionLogs.workflowId, workflowId),
          eq(workflowExecutionLogs.ticketId, ticketId),
          gte(workflowExecutionLogs.executedAt, oneMinuteAgo),
        ),
      );

    const executionCount = recentExecutions[0]?.count ?? 0;

    return executionCount >= 2;
  },

  async getExecutionHistory(workflowId: number, ticketId: number, limit: number = 10) {
    const logs = await db
      .select()
      .from(workflowExecutionLogs)
      .where(
        and(
          eq(workflowExecutionLogs.workflowId, workflowId),
          eq(workflowExecutionLogs.ticketId, ticketId),
        ),
      )
      .orderBy(workflowExecutionLogs.executedAt)
      .limit(limit);

    return logs;
  },

  async shouldStopProcessing(
    workflowId: number,
    ticketId: number,
    stopProcessing: boolean,
  ): Promise<boolean> {
    if (!stopProcessing) {
      return false;
    }

    return await this.detectLoop(workflowId, ticketId);
  },

  getTriggerFields(trigger: string): string[] {
    switch (trigger) {
      case "ticket_created":
        return [
          "id",
          "reference_number",
          "subject",
          "description_html",
          "status_id",
          "priority_id",
          "channel_id",
          "contact_id",
          "created_by",
        ];

      case "ticket_updated":
        return ["id", "updated_at", "updated_by", "subject", "description_html"];

      case "ticket_status_changed":
        return ["id", "status_id", "updated_by"];

      case "ticket_priority_changed":
        return ["id", "priority_id", "updated_by"];

      case "ticket_assigned":
        return ["id", "assigned_agent_id", "assigned_team_id", "updated_by"];

      case "sla_breached":
        return ["id", "status_id", "priority_id", "assigned_agent_id", "assigned_team_id"];

      case "time_elapsed":
        return ["id", "created_at", "due_at", "first_response_at", "resolved_at"];

      default:
        return [];
    }
  },
};
