import { db } from "@ticket-app/db";
import { emailRoutingRules, mailboxes, teams, tags } from "@ticket-app/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

export interface RoutingContext {
  organizationId: number;
  subject?: string;
  bodyText?: string;
  fromEmail?: string;
  channelType?: string;
  priority?: string;
  tags?: string[];
}

export interface RoutingResult {
  mailboxId?: number;
  teamId?: number;
  tagIds?: number[];
  priorityId?: number;
  assignedAgentId?: number;
}

export async function evaluateRoutingRules(
  context: RoutingContext
): Promise<RoutingResult> {
  const rules = await db.query.emailRoutingRules.findMany({
    where: and(
      eq(emailRoutingRules.organizationId, context.organizationId),
      eq(emailRoutingRules.isActive, true),
      isNull(emailRoutingRules.deletedAt)
    ),
    orderBy: [asc(emailRoutingRules.orderBy)],
    with: {
      mailbox: true,
      actionTeam: true,
    },
  });

  for (const rule of rules) {
    const conditions = rule.conditions as Array<{
      field: string;
      operator: string;
      value: string | string[];
    }>;

    const matches = conditions.every((condition) => {
      return evaluateCondition(condition, context);
    });

    if (matches) {
      const result: RoutingResult = {};

      if (rule.mailboxId) {
        result.mailboxId = rule.mailboxId;
      }

      if (rule.actionTeamId) {
        result.teamId = rule.actionTeamId;
      }

      if (rule.actionTagIds && rule.actionTagIds.length > 0) {
        result.tagIds = rule.actionTagIds;
      }

      if (rule.actionPriorityId) {
        result.priorityId = rule.actionPriorityId;
      }

      return result;
    }
  }

  return {};
}

function evaluateCondition(
  condition: { field: string; operator: string; value: string | string[] },
  context: RoutingContext
): boolean {
  let fieldValue: string | undefined;

  switch (condition.field) {
    case "subject":
      fieldValue = context.subject;
      break;
    case "body":
      fieldValue = context.bodyText;
      break;
    case "fromEmail":
      fieldValue = context.fromEmail;
      break;
    case "channelType":
      fieldValue = context.channelType;
      break;
    case "priority":
      fieldValue = context.priority;
      break;
    default:
      return false;
  }

  if (fieldValue === undefined) {
    return false;
  }

  const fieldValueLower = fieldValue.toLowerCase();
  const conditionValue = Array.isArray(condition.value)
    ? condition.value.map((v) => v.toLowerCase())
    : condition.value.toLowerCase();

  switch (condition.operator) {
    case "equals":
      return fieldValueLower === conditionValue;
    case "contains":
      return fieldValueLower.includes(String(conditionValue));
    case "startsWith":
      return fieldValueLower.startsWith(String(conditionValue));
    case "endsWith":
      return fieldValueLower.endsWith(String(conditionValue));
    case "in":
      return Array.isArray(conditionValue) && conditionValue.includes(fieldValueLower);
    case "notIn":
      return Array.isArray(conditionValue) && !conditionValue.includes(fieldValueLower);
    case "regex":
      try {
        const regex = new RegExp(String(conditionValue), "i");
        return regex.test(fieldValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export async function applyRoutingToTicket(
  ticketId: number,
  routingResult: RoutingResult
): Promise<void> {
  const updates: Record<string, any> = {};

  if (routingResult.mailboxId) {
    updates.mailboxId = routingResult.mailboxId;
  }

  if (routingResult.teamId) {
    updates.assignedTeamId = routingResult.teamId;
  }

  if (routingResult.priorityId) {
    updates.priorityId = routingResult.priorityId;
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(db.query.tickets)
      .set(updates)
      .where(eq(db.query.tickets.id, ticketId));
  }
}
