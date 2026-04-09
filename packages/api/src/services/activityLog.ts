import { db } from "@ticket-app/db";
import { auditLogs, notifications, users } from "@ticket-app/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type AuditAction =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.deleted"
  | "ticket.status_changed"
  | "ticket.priority_changed"
  | "ticket.assigned"
  | "ticket.merged"
  | "ticket.locked"
  | "ticket.unlocked"
  | "ticket.spam_marked"
  | "ticket.spam_unmarked"
  | "message.created"
  | "message.updated"
  | "message.deleted"
  | "note.created"
  | "note.updated"
  | "note.deleted"
  | "sla.breached"
  | "sla.resumed"
  | "sla.initialized"
  | "follower.added"
  | "follower.removed"
  | "cc.added"
  | "cc.removed"
  | "tag.added"
  | "tag.removed";

export interface LogAuditInput {
  organizationId: number;
  userId?: number;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateNotificationInput {
  organizationId: number;
  userId: number;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export async function logAudit(input: LogAuditInput) {
  const [log] = await db
    .insert(auditLogs)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      changes: input.changes ? JSON.parse(JSON.stringify(input.changes)) : null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      sessionId: input.sessionId,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
    })
    .returning();

  return log;
}

export async function logTicketCreated(params: {
  ticketId: number;
  organizationId: number;
  userId?: number;
  subject: string;
  referenceNumber: string;
}) {
  return logAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: "ticket.created",
    resourceType: "ticket",
    resourceId: String(params.ticketId),
    metadata: {
      subject: params.subject,
      referenceNumber: params.referenceNumber,
    },
  });
}

export async function logTicketStatusChange(params: {
  ticketId: number;
  organizationId: number;
  userId?: number;
  fromStatus: string;
  toStatus: string;
  referenceNumber: string;
}) {
  return logAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: "ticket.status_changed",
    resourceType: "ticket",
    resourceId: String(params.ticketId),
    changes: {
      status: { from: params.fromStatus, to: params.toStatus },
    },
    metadata: {
      referenceNumber: params.referenceNumber,
    },
  });
}

export async function logTicketPriorityChange(params: {
  ticketId: number;
  organizationId: number;
  userId?: number;
  fromPriority: string;
  toPriority: string;
  referenceNumber: string;
}) {
  return logAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: "ticket.priority_changed",
    resourceType: "ticket",
    resourceId: String(params.ticketId),
    changes: {
      priority: { from: params.fromPriority, to: params.toPriority },
    },
    metadata: {
      referenceNumber: params.referenceNumber,
    },
  });
}

export async function logTicketAssignment(params: {
  ticketId: number;
  organizationId: number;
  userId?: number;
  fromAgent?: string;
  toAgent?: string;
  fromTeam?: string;
  toTeam?: string;
  referenceNumber: string;
}) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  if (params.fromAgent !== undefined || params.toAgent !== undefined) {
    changes.agent = { from: params.fromAgent ?? null, to: params.toAgent ?? null };
  }
  if (params.fromTeam !== undefined || params.toTeam !== undefined) {
    changes.team = { from: params.fromTeam ?? null, to: params.toTeam ?? null };
  }

  return logAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: "ticket.assigned",
    resourceType: "ticket",
    resourceId: String(params.ticketId),
    changes,
    metadata: {
      referenceNumber: params.referenceNumber,
    },
  });
}

export async function logTicketMerge(params: {
  masterTicketId: number;
  mergedTicketId: number;
  organizationId: number;
  userId: number;
  masterReference: string;
  mergedReference: string;
}) {
  return logAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: "ticket.merged",
    resourceType: "ticket",
    resourceId: String(params.masterTicketId),
    changes: {
      mergedTicket: { from: null, to: String(params.mergedTicketId) },
    },
    metadata: {
      masterReference: params.masterReference,
      mergedReference: params.mergedReference,
    },
  });
}

export async function logMessageCreated(params: {
  ticketId: number;
  messageId: number;
  organizationId: number;
  userId?: number;
  messageType: string;
  isPrivate: boolean;
  referenceNumber: string;
}) {
  return logAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: params.messageType === "note" ? "note.created" : "message.created",
    resourceType: "ticket_message",
    resourceId: String(params.messageId),
    changes: {
      ticketId: { from: null, to: String(params.ticketId) },
      isPrivate: { from: null, to: params.isPrivate },
    },
    metadata: {
      referenceNumber: params.referenceNumber,
    },
  });
}

export async function logSLABreach(params: {
  ticketId: number;
  organizationId: number;
  breachType: "first_response" | "resolution";
  dueAt: Date;
  referenceNumber: string;
}) {
  return logAudit({
    organizationId: params.organizationId,
    action: "sla.breached",
    resourceType: "ticket",
    resourceId: String(params.ticketId),
    metadata: {
      breachType: params.breachType,
      dueAt: params.dueAt.toISOString(),
      referenceNumber: params.referenceNumber,
    },
  });
}

export async function getTicketAuditHistory(
  ticketId: number,
  options: { limit?: number; offset?: number } = {},
) {
  const { limit = 50, offset = 0 } = options;

  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      changes: auditLogs.changes,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      userId: auditLogs.userId,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(and(eq(auditLogs.resourceType, "ticket"), eq(auditLogs.resourceId, String(ticketId))))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    changes: log.changes,
    metadata: log.metadata,
    createdAt: log.createdAt,
    user: log.userId
      ? {
          id: log.userId,
          firstName: log.userFirstName,
          lastName: log.userLastName,
          email: log.userEmail,
        }
      : null,
  }));
}

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ? JSON.parse(JSON.stringify(input.data)) : null,
    })
    .returning();

  return notification;
}

export async function notifyTicketAssigned(params: {
  ticketId: number;
  referenceNumber: string;
  assignedUserId: number;
  organizationId: number;
  assignedBy?: number;
}) {
  return createNotification({
    organizationId: params.organizationId,
    userId: params.assignedUserId,
    type: "ticket_assigned",
    title: "Ticket Assigned",
    body: `Ticket ${params.referenceNumber} has been assigned to you.`,
    data: {
      ticketId: params.ticketId,
      referenceNumber: params.referenceNumber,
      assignedBy: params.assignedBy,
    },
  });
}

export async function notifyTicketStatusChanged(params: {
  ticketId: number;
  referenceNumber: string;
  newStatus: string;
  organizationId: number;
  excludeUserIds?: number[];
}) {
  return createNotification({
    organizationId: params.organizationId,
    userId: 0,
    type: "ticket_status_changed",
    title: "Ticket Status Updated",
    body: `Ticket ${params.referenceNumber} status changed to ${params.newStatus}.`,
    data: {
      ticketId: params.ticketId,
      referenceNumber: params.referenceNumber,
      newStatus: params.newStatus,
    },
  });
}

export async function notifySLABreached(params: {
  ticketId: number;
  referenceNumber: string;
  breachType: "first_response" | "resolution";
  organizationId: number;
  assigneeId?: number;
  escalateAgentId?: number;
}) {
  const notifyUserId = params.assigneeId ?? params.escalateAgentId ?? 0;

  return createNotification({
    organizationId: params.organizationId,
    userId: notifyUserId,
    type: "sla_breached",
    title: "SLA Breached",
    body: `Ticket ${params.referenceNumber} has breached its ${params.breachType.replace("_", " ")} SLA.`,
    data: {
      ticketId: params.ticketId,
      referenceNumber: params.referenceNumber,
      breachType: params.breachType,
    },
  });
}
