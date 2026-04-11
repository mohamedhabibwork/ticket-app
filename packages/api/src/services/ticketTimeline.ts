import { db } from "@ticket-app/db";
import {
  tickets,
  ticketMessages,
  ticketAttachments,
  lookups,
  users,
  contacts,
  savedReplies,
  ticketSla,
  slaPolicies,
  slaPolicyTargets,
  organizations,
} from "@ticket-app/db/schema";
import { eq, and, desc, isNull, inArray } from "drizzle-orm";
import { applyMergeTags, type MergeTagContext } from "./savedReplies";
import { calculateSLADueDates, isStatusPaused, getStatusKey } from "./sla";

export type MessageType = "reply" | "note" | "activity";
export type AuthorType = "agent" | "contact" | "system";

export interface CreateMessageInput {
  ticketId: number;
  authorType: AuthorType;
  authorUserId?: number;
  authorContactId?: number;
  messageType: MessageType;
  bodyHtml?: string;
  bodyText?: string;
  isPrivate?: boolean;
  createdBy?: number;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
  }>;
}

export interface CreateActivityInput {
  ticketId: number;
  activityType: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdBy?: number;
}

export interface TimelineEntry {
  id: number;
  uuid: string;
  authorType: string | null;
  authorUserId: number | null;
  authorContactId: number | null;
  messageType: string;
  bodyHtml: string | null;
  bodyText: string | null;
  isPrivate: boolean;
  createdAt: Date;
  createdBy: number | null;
  author?: {
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  attachments?: Array<{
    id: number;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }>;
}

export interface TicketTimeline {
  ticket: {
    id: number;
    uuid: string;
    referenceNumber: string;
    subject: string;
    statusId: number;
    priorityId: number;
    channelId: number | null;
    contactId: number | null;
    assignedAgentId: number | null;
    assignedTeamId: number | null;
    firstResponseAt: Date | null;
    resolvedAt: Date | null;
    closedAt: Date | null;
    isLocked: boolean;
    isSpam: boolean;
    isMerged: boolean;
    createdAt: Date;
  };
  messages: TimelineEntry[];
  activities: TimelineEntry[];
  sla?: {
    firstResponseDueAt: Date | null;
    resolutionDueAt: Date | null;
    firstResponseBreached: boolean;
    resolutionBreached: boolean;
    pausedAt: Date | null;
    pausedDurationMinutes: number;
  };
}

export async function createMessage(input: CreateMessageInput) {
  const [message] = await db
    .insert(ticketMessages)
    .values({
      ticketId: input.ticketId,
      authorType: input.authorType,
      authorUserId: input.authorUserId,
      authorContactId: input.authorContactId,
      messageType: input.messageType,
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText,
      isPrivate: input.isPrivate ?? false,
      createdBy: input.createdBy,
    })
    .returning();

  if (input.attachments && input.attachments.length > 0) {
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, input.ticketId),
    });
    await db.insert(ticketAttachments).values(
      input.attachments.map((att) => ({
        organizationId: ticket!.organizationId,
        ticketId: input.ticketId,
        ticketMessageId: message!.id,
        filename: att.filename,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        storageKey: att.storageKey,
        createdBy: input.createdBy,
      })),
    );
  }

  if (input.messageType === "reply" && input.authorType === "agent") {
    await db
      .update(tickets)
      .set({ firstResponseAt: new Date() })
      .where(eq(tickets.id, input.ticketId));
  }

  return message;
}

export async function createActivity(input: CreateActivityInput) {
  const [message] = await db
    .insert(ticketMessages)
    .values({
      ticketId: input.ticketId,
      authorType: "system",
      messageType: "activity",
      bodyHtml: `<div class="activity-entry"><span class="activity-type">${input.activityType}</span><span class="activity-description">${input.description}</span></div>`,
      bodyText: `[${input.activityType}] ${input.description}`,
      isPrivate: false,
      createdBy: input.createdBy,
    })
    .returning();

  return message;
}

export async function getTimeline(
  ticketId: number,
  options: { includePrivate?: boolean; includeAttachments?: boolean } = {},
): Promise<TicketTimeline | null> {
  const { includePrivate = false, includeAttachments = true } = options;

  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, ticketId), isNull(tickets.deletedAt)),
  });

  if (!ticket) return null;

  const messageConditions = [eq(ticketMessages.ticketId, ticketId)];

  if (!includePrivate) {
    messageConditions.push(eq(ticketMessages.isPrivate, false));
  }

  const allMessages = await db
    .select({
      id: ticketMessages.id,
      uuid: ticketMessages.uuid,
      authorType: ticketMessages.authorType,
      authorUserId: ticketMessages.authorUserId,
      authorContactId: ticketMessages.authorContactId,
      messageType: ticketMessages.messageType,
      bodyHtml: ticketMessages.bodyHtml,
      bodyText: ticketMessages.bodyText,
      isPrivate: ticketMessages.isPrivate,
      createdAt: ticketMessages.createdAt,
      createdBy: ticketMessages.createdBy,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorDisplayName: users.displayName,
      authorEmail: users.email,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(ticketMessages)
    .leftJoin(users, eq(ticketMessages.authorUserId, users.id))
    .where(and(...messageConditions))
    .orderBy(desc(ticketMessages.createdAt));

  let attachments: Array<{
    id: number;
    ticketMessageId: number | null;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }> = [];

  if (includeAttachments && allMessages.length > 0) {
    const messageIds = allMessages.map((m) => m.id);
    attachments = await db
      .select({
        id: ticketAttachments.id,
        ticketMessageId: ticketAttachments.ticketMessageId,
        filename: ticketAttachments.filename,
        mimeType: ticketAttachments.mimeType,
        sizeBytes: ticketAttachments.sizeBytes,
      })
      .from(ticketAttachments)
      .where(inArray(ticketAttachments.ticketMessageId, messageIds));
  }

  const messages: TimelineEntry[] = allMessages
    .filter((m) => m.messageType !== "activity")
    .map((m) => ({
      id: m.id,
      uuid: m.uuid,
      authorType: m.authorType,
      authorUserId: m.authorUserId,
      authorContactId: m.authorContactId,
      messageType: m.messageType,
      bodyHtml: m.bodyHtml,
      bodyText: m.bodyText,
      isPrivate: m.isPrivate,
      createdAt: m.createdAt,
      createdBy: m.createdBy,
      author: m.authorFirstName
        ? {
            firstName: m.authorFirstName,
            lastName: m.authorLastName,
            displayName: m.authorDisplayName,
            email: m.authorEmail,
            avatarUrl: m.authorAvatarUrl,
          }
        : undefined,
      attachments: attachments
        .filter((a) => a.ticketMessageId === m.id)
        .map((a) => ({
          id: a.id,
          filename: a.filename,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
        })),
    }));

  const activities: TimelineEntry[] = allMessages
    .filter((m) => m.messageType === "activity")
    .map((m) => ({
      id: m.id,
      uuid: m.uuid,
      authorType: m.authorType,
      authorUserId: m.authorUserId,
      authorContactId: m.authorContactId,
      messageType: m.messageType,
      bodyHtml: m.bodyHtml,
      bodyText: m.bodyText,
      isPrivate: m.isPrivate,
      createdAt: m.createdAt,
      createdBy: m.createdBy,
    }));

  let slaData = undefined;
  const sla = await db.query.ticketSla.findFirst({
    where: eq(ticketSla.ticketId, ticketId),
  });

  if (sla) {
    slaData = {
      firstResponseDueAt: sla.firstResponseDueAt,
      resolutionDueAt: sla.resolutionDueAt,
      firstResponseBreached: sla.firstResponseBreached,
      resolutionBreached: sla.resolutionBreached,
      pausedAt: sla.pausedAt,
      pausedDurationMinutes: sla.pausedDurationMinutes,
    };
  }

  return {
    ticket: {
      id: ticket.id,
      uuid: ticket.uuid,
      referenceNumber: ticket.referenceNumber,
      subject: ticket.subject,
      statusId: ticket.statusId,
      priorityId: ticket.priorityId,
      channelId: ticket.channelId,
      contactId: ticket.contactId,
      assignedAgentId: ticket.assignedAgentId,
      assignedTeamId: ticket.assignedTeamId,
      firstResponseAt: ticket.firstResponseAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      isLocked: ticket.isLocked,
      isSpam: ticket.isSpam,
      isMerged: ticket.isMerged,
      createdAt: ticket.createdAt,
    },
    messages,
    activities,
    sla: slaData,
  };
}

export async function applySavedReply(
  savedReplyId: number,
  ticketId: number,
  agentId: number,
): Promise<{ bodyHtml: string; bodyText: string } | null> {
  const [savedReply] = await db
    .select()
    .from(savedReplies)
    .where(eq(savedReplies.id, savedReplyId));

  if (!savedReply) return null;

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    with: {
      contact: true,
      status: true,
      priority: true,
      channel: true,
    },
  });

  const agent = await db.query.users.findFirst({
    where: eq(users.id, agentId),
  });

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, ticket?.organizationId ?? 0),
  });

  const context: MergeTagContext = {
    ticket: ticket
      ? {
          referenceNumber: ticket.referenceNumber,
          subject: ticket.subject,
          status: ticket.status?.label,
          priority: ticket.priority?.label,
          channel: ticket.channel?.label,
        }
      : undefined,
    contact: ticket?.contact
      ? {
          firstName: ticket.contact.firstName ?? undefined,
          lastName: ticket.contact.lastName ?? undefined,
          email: ticket.contact.email ?? undefined,
          phone: ticket.contact.phone ?? undefined,
          company: ticket.contact.company ?? undefined,
        }
      : undefined,
    agent: agent
      ? {
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email,
          displayName: agent.displayName ?? undefined,
        }
      : undefined,
    organization: org ? { name: org.name } : undefined,
  };

  return {
    bodyHtml: applyMergeTags(savedReply.bodyHtml, context),
    bodyText: savedReply.bodyText
      ? applyMergeTags(savedReply.bodyText, context)
      : savedReply.bodyHtml.replace(/<[^>]*>/g, ""),
  };
}

export async function initializeSLA(ticketId: number, organizationId: number) {
  const orgSLAPolicies = await db
    .select()
    .from(slaPolicies)
    .where(and(eq(slaPolicies.organizationId, organizationId), eq(slaPolicies.isDefault, true)));

  if (orgSLAPolicies.length === 0) return null;

  const defaultPolicy = orgSLAPolicies[0]!;

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
  });

  if (!ticket) return null;

  const policyTargets = await db
    .select()
    .from(slaPolicyTargets)
    .where(eq(slaPolicyTargets.slaPolicyId, defaultPolicy.id));

  const target = policyTargets.find((t) => t.priorityId === ticket.priorityId);

  if (!target) return null;

  const { firstResponseDueAt, resolutionDueAt } = calculateSLADueDates(
    ticket.createdAt,
    target.firstResponseMinutes,
    target.resolutionMinutes,
    defaultPolicy.businessHoursOnly ? (defaultPolicy.businessHoursConfig as any) : null,
    defaultPolicy.holidays as any,
  );

  const [slaRecord] = await db
    .insert(ticketSla)
    .values({
      ticketId,
      slaPolicyId: defaultPolicy.id,
      firstResponseDueAt,
      resolutionDueAt,
    })
    .returning();

  return slaRecord;
}

export async function checkAndUpdateSLABreaches(ticketId: number) {
  const sla = await db.query.ticketSla.findFirst({
    where: eq(ticketSla.ticketId, ticketId),
  });

  if (!sla || sla.pausedAt) return;

  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (!sla.firstResponseBreached && sla.firstResponseDueAt && now > sla.firstResponseDueAt) {
    updates.firstResponseBreached = true;
    updates.firstResponseBreachedAt = now;
  }

  if (!sla.resolutionBreached && sla.resolutionDueAt && now > sla.resolutionDueAt) {
    updates.resolutionBreached = true;
    updates.resolutionBreachedAt = now;
  }

  if (Object.keys(updates).length > 1) {
    await db.update(ticketSla).set(updates).where(eq(ticketSla.ticketId, ticketId));
  }
}

export async function pauseSLA(ticketId: number) {
  const sla = await db.query.ticketSla.findFirst({
    where: eq(ticketSla.ticketId, ticketId),
  });

  if (!sla || sla.pausedAt) return;

  await db.update(ticketSla).set({ pausedAt: new Date() }).where(eq(ticketSla.ticketId, ticketId));
}

export async function resumeSLA(ticketId: number) {
  const sla = await db.query.ticketSla.findFirst({
    where: eq(ticketSla.ticketId, ticketId),
  });

  if (!sla || !sla.pausedAt) return;

  const pausedMs = new Date().getTime() - sla.pausedAt.getTime();
  const pausedMinutes = Math.floor(pausedMs / 60000);

  await db
    .update(ticketSla)
    .set({
      pausedAt: null,
      pausedDurationMinutes: sla.pausedDurationMinutes + pausedMinutes,
    })
    .where(eq(ticketSla.ticketId, ticketId));
}

export async function updateTicketStatusWithSLA(
  ticketId: number,
  newStatusId: number,
  updatedBy?: number,
) {
  const status = await db.query.lookups.findFirst({
    where: eq(lookups.id, newStatusId),
  });

  if (!status) return null;

  const updates: Record<string, unknown> = {
    statusId: newStatusId,
    updatedAt: new Date(),
    updatedBy,
  };

  const statusKey = getStatusKey(status);
  const isPausedStatus = isStatusPaused(statusKey);

  if (status.metadata && typeof status.metadata === "object") {
    const meta = status.metadata as Record<string, unknown>;
    if (meta.resolved === true) {
      updates.resolvedAt = new Date();
    }
    if (meta.closed === true) {
      updates.closedAt = new Date();
    }
  }

  const [updated] = await db
    .update(tickets)
    .set(updates)
    .where(eq(tickets.id, ticketId))
    .returning();

  if (isPausedStatus) {
    await pauseSLA(ticketId);
  } else if (statusKey === "open" || statusKey === "pending") {
    await resumeSLA(ticketId);
  }

  await checkAndUpdateSLABreaches(ticketId);

  return updated;
}

export async function getConversationThread(
  ticketId: number,
  options: { includePrivate?: boolean } = {},
) {
  const { includePrivate = false } = options;

  const conditions = [
    eq(ticketMessages.ticketId, ticketId),
    eq(ticketMessages.messageType, "reply"),
  ];

  if (!includePrivate) {
    conditions.push(eq(ticketMessages.isPrivate, false));
  }

  const messages = await db
    .select({
      id: ticketMessages.id,
      uuid: ticketMessages.uuid,
      authorType: ticketMessages.authorType,
      authorUserId: ticketMessages.authorUserId,
      authorContactId: ticketMessages.authorContactId,
      bodyHtml: ticketMessages.bodyHtml,
      bodyText: ticketMessages.bodyText,
      isPrivate: ticketMessages.isPrivate,
      createdAt: ticketMessages.createdAt,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorDisplayName: users.displayName,
      authorEmail: users.email,
      authorAvatarUrl: users.avatarUrl,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactEmail: contacts.email,
      contactAvatarUrl: contacts.avatarUrl,
    })
    .from(ticketMessages)
    .leftJoin(users, eq(ticketMessages.authorUserId, users.id))
    .leftJoin(contacts, eq(ticketMessages.authorContactId, contacts.id))
    .where(and(...conditions))
    .orderBy(ticketMessages.createdAt);

  return messages.map((m) => ({
    id: m.id,
    uuid: m.uuid,
    authorType: m.authorType,
    authorUserId: m.authorUserId,
    authorContactId: m.authorContactId,
    bodyHtml: m.bodyHtml,
    bodyText: m.bodyText,
    isPrivate: m.isPrivate,
    createdAt: m.createdAt,
    author:
      m.authorType === "agent"
        ? {
            firstName: m.authorFirstName,
            lastName: m.authorLastName,
            displayName: m.authorDisplayName,
            email: m.authorEmail,
            avatarUrl: m.authorAvatarUrl,
            type: "agent" as const,
          }
        : {
            firstName: m.contactFirstName,
            lastName: m.contactLastName,
            email: m.contactEmail,
            avatarUrl: m.contactAvatarUrl,
            type: "contact" as const,
          },
  }));
}

export async function getInternalNotes(
  ticketId: number,
  options: { includePrivate?: boolean } = {},
) {
  const { includePrivate = true } = options;

  if (!includePrivate) return [];

  const notes = await db
    .select({
      id: ticketMessages.id,
      uuid: ticketMessages.uuid,
      bodyHtml: ticketMessages.bodyHtml,
      bodyText: ticketMessages.bodyText,
      isPrivate: ticketMessages.isPrivate,
      createdAt: ticketMessages.createdAt,
      createdBy: ticketMessages.createdBy,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorDisplayName: users.displayName,
      authorEmail: users.email,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(ticketMessages)
    .leftJoin(users, eq(ticketMessages.authorUserId, users.id))
    .where(
      and(
        eq(ticketMessages.ticketId, ticketId),
        eq(ticketMessages.messageType, "note"),
        eq(ticketMessages.isPrivate, true),
      ),
    )
    .orderBy(desc(ticketMessages.createdAt));

  return notes.map((n) => ({
    id: n.id,
    uuid: n.uuid,
    bodyHtml: n.bodyHtml,
    bodyText: n.bodyText,
    createdAt: n.createdAt,
    author: {
      firstName: n.authorFirstName,
      lastName: n.authorLastName,
      displayName: n.authorDisplayName,
      email: n.authorEmail,
      avatarUrl: n.authorAvatarUrl,
    },
  }));
}
