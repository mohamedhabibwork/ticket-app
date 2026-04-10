import { db } from "@ticket-app/db";
import {
  tickets,
  ticketMessages,
  ticketCc,
  ticketTags,
  ticketMerges,
  ticketFollowers,
  lookups,
  teams,
  savedReplies,
} from "@ticket-app/db/schema";
import { eq, and, isNull, desc, sql, inArray, asc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";
import { generateReferenceNumber } from "../lib/reference";
import {
  createMessage,
  createActivity,
  getTimeline,
  applySavedReply,
  initializeSLA,
  updateTicketStatusWithSLA,
  checkAndUpdateSLABreaches,
  getConversationThread,
  getInternalNotes,
} from "../services/ticketTimeline";
import {
  logAudit,
  logTicketCreated,
  logTicketStatusChange,
  logTicketPriorityChange,
  logTicketAssignment,
  logTicketMerge,
  logMessageCreated,
  notifyTicketAssigned,
  getTicketAuditHistory,
} from "../services/activityLog";

const MessageType = {
  REPLY: "reply",
  NOTE: "note",
  ACTIVITY: "activity",
} as const;

const AuthorType = {
  AGENT: "agent",
  CONTACT: "contact",
  SYSTEM: "system",
} as const;

export const ticketsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        statusId: z.coerce.number().optional(),
        priorityId: z.coerce.number().optional(),
        channelId: z.coerce.number().optional(),
        assignedAgentId: z.coerce.number().optional(),
        contactId: z.coerce.number().optional(),
        groupId: z.coerce.number().optional(),
        categoryId: z.coerce.number().optional(),
        search: z.string().optional(),
        tagIds: z.array(z.coerce.number()).optional(),
        isSpam: z.coerce.boolean().optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
        sortBy: z.enum(["created_at", "updated_at", "priority", "status"]).default("created_at"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(tickets.organizationId, input.organizationId),
        isNull(tickets.deletedAt),
      ];

      if (input.statusId) conditions.push(eq(tickets.statusId, input.statusId));
      if (input.priorityId) conditions.push(eq(tickets.priorityId, input.priorityId));
      if (input.channelId) conditions.push(eq(tickets.channelId, input.channelId));
      if (input.assignedAgentId)
        conditions.push(eq(tickets.assignedAgentId, input.assignedAgentId));
      if (input.contactId) conditions.push(eq(tickets.contactId, input.contactId));
      if (input.isSpam !== undefined) conditions.push(eq(tickets.isSpam, input.isSpam));
      if (input.search) {
        conditions.push(sql`${tickets.subject} ILIKE ${`%${input.search}%`}`);
      }

      if (input.groupId) {
        const teamIdsResult = await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.organizationId, input.organizationId));
        const teamIds = teamIdsResult.map((t) => t.id);
        if (teamIds.length > 0) {
          conditions.push(inArray(tickets.assignedTeamId, teamIds));
        } else {
          conditions.push(eq(tickets.assignedTeamId, -1));
        }
      }

      const orderByColumn =
        input.sortBy === "priority"
          ? tickets.priorityId
          : input.sortBy === "status"
            ? tickets.statusId
            : input.sortBy === "updated_at"
              ? tickets.updatedAt
              : tickets.createdAt;

      const orderBy = input.sortDir === "asc" ? asc(orderByColumn) : desc(orderByColumn);

      let ticketList = await db.query.tickets.findMany({
        where: and(...conditions),
        orderBy: [orderBy],
        limit: input.limit,
        offset: input.offset,
        with: {
          contact: true,
          status: true,
          priority: true,
          channel: true,
          assignedAgent: true,
          assignedTeam: true,
          sla: true,
        },
      });

      if (input.tagIds && input.tagIds.length > 0) {
        const ticketIdsWithTags = await db
          .select({ ticketId: ticketTags.ticketId })
          .from(ticketTags)
          .where(inArray(ticketTags.tagId, input.tagIds));

        const taggedTicketIds = new Set(ticketIdsWithTags.map((t) => t.ticketId));
        ticketList = ticketList.filter((t) => taggedTicketIds.has(t.id));
      }

      return ticketList;
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const ticket = await db.query.tickets.findFirst({
        where: and(
          eq(tickets.id, input.id),
          eq(tickets.organizationId, input.organizationId),
          isNull(tickets.deletedAt),
        ),
        with: {
          contact: true,
          status: true,
          priority: true,
          channel: true,
          assignedAgent: true,
          assignedTeam: true,
          mailbox: true,
          messages: {
            orderBy: [desc(ticketMessages.createdAt)],
            with: {
              authorUser: true,
              authorContact: true,
              attachments: true,
            },
          },
          sla: true,
        },
      });

      return ticket;
    }),

  getByReference: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        referenceNumber: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.tickets.findFirst({
        where: and(
          eq(tickets.referenceNumber, input.referenceNumber),
          eq(tickets.organizationId, input.organizationId),
          isNull(tickets.deletedAt),
        ),
        with: {
          contact: true,
          status: true,
          priority: true,
          channel: true,
          assignedAgent: true,
          assignedTeam: true,
          sla: true,
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        subject: z.string().min(1).max(500),
        descriptionHtml: z.string().optional(),
        descriptionText: z.string().optional(),
        statusId: z.coerce.number().optional(),
        priorityId: z.coerce.number().optional(),
        channelId: z.coerce.number().optional(),
        contactId: z.coerce.number().optional(),
        assignedAgentId: z.coerce.number().optional(),
        assignedTeamId: z.coerce.number().optional(),
        mailboxId: z.coerce.number().optional(),
        formSubmissionId: z.coerce.number().optional(),
        parentTicketId: z.coerce.number().optional(),
        ccEmails: z.array(z.string().email()).optional(),
        isSpam: z.coerce.boolean().default(false),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const referenceNumber = await generateReferenceNumber(input.organizationId);

      const defaultStatusId =
        input.statusId ??
        (
          await db.query.lookups.findFirst({
            where: and(
              eq(
                lookups.lookupTypeId,
                sql`(SELECT id FROM lookup_types WHERE name = 'ticket_status')`,
              ),
              eq(lookups.isDefault, true),
            ),
          })
        )?.id;

      const defaultPriorityId =
        input.priorityId ??
        (
          await db.query.lookups.findFirst({
            where: and(
              eq(
                lookups.lookupTypeId,
                sql`(SELECT id FROM lookup_types WHERE name = 'ticket_priority')`,
              ),
              eq(lookups.isDefault, true),
            ),
          })
        )?.id;

      const [ticket] = await db
        .insert(tickets)
        .values({
          organizationId: input.organizationId,
          referenceNumber,
          subject: input.subject,
          descriptionHtml: input.descriptionHtml,
          statusId: defaultStatusId,
          priorityId: defaultPriorityId,
          channelId: input.channelId,
          contactId: input.contactId,
          assignedAgentId: input.assignedAgentId,
          assignedTeamId: input.assignedTeamId,
          mailboxId: input.mailboxId,
          formSubmissionId: input.formSubmissionId,
          parentTicketId: input.parentTicketId,
          isSpam: input.isSpam,
          createdBy: input.createdBy,
        })
        .returning();

      if (input.descriptionHtml || input.descriptionText) {
        await createMessage({
          ticketId: ticket.id,
          authorType: input.contactId ? AuthorType.CONTACT : AuthorType.AGENT,
          authorContactId: input.contactId,
          authorUserId: input.createdBy,
          messageType: MessageType.REPLY,
          bodyHtml: input.descriptionHtml,
          bodyText: input.descriptionText,
          createdBy: input.createdBy,
        });
      }

      if (input.ccEmails && input.ccEmails.length > 0) {
        await db.insert(ticketCc).values(
          input.ccEmails.map((email) => ({
            ticketId: ticket.id,
            email: email.toLowerCase(),
          })),
        );
      }

      await initializeSLA(ticket.id, input.organizationId);

      await logTicketCreated({
        ticketId: ticket.id,
        organizationId: input.organizationId,
        userId: input.createdBy,
        subject: input.subject,
        referenceNumber,
      });

      return ticket;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        subject: z.string().min(1).max(500).optional(),
        descriptionHtml: z.string().optional(),
        priorityId: z.coerce.number().optional(),
        statusId: z.coerce.number().optional(),
        assignedAgentId: z.coerce.number().nullable().optional(),
        assignedTeamId: z.coerce.number().nullable().optional(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.tickets.findFirst({
        where: and(
          eq(tickets.id, input.id),
          eq(tickets.organizationId, input.organizationId),
          isNull(tickets.deletedAt),
        ),
        with: {
          status: true,
          priority: true,
          assignedAgent: true,
          assignedTeam: true,
        },
      });

      if (!existing) return null;

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      };

      if (input.subject !== undefined) updates.subject = input.subject;
      if (input.descriptionHtml !== undefined) updates.descriptionHtml = input.descriptionHtml;
      if (input.priorityId !== undefined) updates.priorityId = input.priorityId;
      if (input.assignedAgentId !== undefined) updates.assignedAgentId = input.assignedAgentId;
      if (input.assignedTeamId !== undefined) updates.assignedTeamId = input.assignedTeamId;

      if (input.statusId !== undefined) {
        const [updated] = await db
          .update(tickets)
          .set({ ...updates, statusId: input.statusId })
          .where(eq(tickets.id, input.id))
          .returning();

        await updateTicketStatusWithSLA(input.id, input.statusId, input.updatedBy);

        const newStatus = await db.query.lookups.findFirst({
          where: eq(lookups.id, input.statusId),
        });

        if (newStatus && existing.status) {
          await logTicketStatusChange({
            ticketId: input.id,
            organizationId: input.organizationId,
            userId: input.updatedBy,
            fromStatus: existing.status.label,
            toStatus: newStatus.label,
            referenceNumber: existing.referenceNumber,
          });
        }

        return updated;
      }

      if (input.assignedAgentId !== undefined || input.assignedTeamId !== undefined) {
        const [updated] = await db
          .update(tickets)
          .set(updates)
          .where(eq(tickets.id, input.id))
          .returning();

        await logTicketAssignment({
          ticketId: input.id,
          organizationId: input.organizationId,
          userId: input.updatedBy,
          fromAgent: existing.assignedAgent
            ? `${existing.assignedAgent.firstName} ${existing.assignedAgent.lastName}`
            : undefined,
          toAgent:
            input.assignedAgentId !== undefined
              ? input.assignedAgentId
                ? "New Agent"
                : "Unassigned"
              : undefined,
          fromTeam: existing.assignedTeam?.name,
          toTeam:
            input.assignedTeamId !== undefined
              ? input.assignedTeamId
                ? "New Team"
                : "Unassigned"
              : undefined,
          referenceNumber: existing.referenceNumber,
        });

        if (input.assignedAgentId && input.assignedAgentId !== existing.assignedAgentId) {
          await notifyTicketAssigned({
            ticketId: input.id,
            referenceNumber: existing.referenceNumber,
            assignedUserId: input.assignedAgentId,
            organizationId: input.organizationId,
            assignedBy: input.updatedBy,
          });
        }

        return updated;
      }

      if (input.priorityId !== undefined && input.priorityId !== existing.priorityId) {
        const newPriority = await db.query.lookups.findFirst({
          where: eq(lookups.id, input.priorityId),
        });

        const [updated] = await db
          .update(tickets)
          .set(updates)
          .where(eq(tickets.id, input.id))
          .returning();

        await logTicketPriorityChange({
          ticketId: input.id,
          organizationId: input.organizationId,
          userId: input.updatedBy,
          fromPriority: existing.priority?.label ?? "Unknown",
          toPriority: newPriority?.label ?? "Unknown",
          referenceNumber: existing.referenceNumber,
        });

        return updated;
      }

      const [updated] = await db
        .update(tickets)
        .set(updates)
        .where(eq(tickets.id, input.id))
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
      const ticket = await db.query.tickets.findFirst({
        where: and(
          eq(tickets.id, input.id),
          eq(tickets.organizationId, input.organizationId),
          isNull(tickets.deletedAt),
        ),
      });

      if (!ticket) return null;

      const [deleted] = await db
        .update(tickets)
        .set({
          deletedAt: new Date(),
          deletedBy: input.deletedBy,
        })
        .where(eq(tickets.id, input.id))
        .returning();

      await logAudit({
        organizationId: input.organizationId,
        userId: input.deletedBy,
        action: "ticket.deleted",
        resourceType: "ticket",
        resourceId: String(input.id),
        metadata: {
          referenceNumber: ticket.referenceNumber,
          subject: ticket.subject,
        },
      });

      return deleted;
    }),

  addCc: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        email: z.string().email(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [cc] = await db
        .insert(ticketCc)
        .values({
          ticketId: input.ticketId,
          email: input.email.toLowerCase(),
        })
        .onConflictDoNothing()
        .returning();

      if (cc) {
        await logAudit({
          organizationId: 0,
          userId: input.createdBy,
          action: "cc.added",
          resourceType: "ticket",
          resourceId: String(input.ticketId),
          metadata: { email: input.email },
        });
      }

      return cc;
    }),

  removeCc: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        email: z.string().email(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .delete(ticketCc)
        .where(
          and(eq(ticketCc.ticketId, input.ticketId), eq(ticketCc.email, input.email.toLowerCase())),
        );

      await logAudit({
        organizationId: 0,
        action: "cc.removed",
        resourceType: "ticket",
        resourceId: String(input.ticketId),
        metadata: { email: input.email },
      });

      return { success: true };
    }),

  assign: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        assignedAgentId: z.coerce.number().nullable().optional(),
        assignedTeamId: z.coerce.number().nullable().optional(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.id),
        with: { assignedAgent: true, assignedTeam: true },
      });

      const [updated] = await db
        .update(tickets)
        .set({
          assignedAgentId: input.assignedAgentId,
          assignedTeamId: input.assignedTeamId,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        })
        .where(eq(tickets.id, input.id))
        .returning();

      if (updated && existing) {
        await logTicketAssignment({
          ticketId: input.id,
          organizationId: input.organizationId,
          userId: input.updatedBy,
          fromAgent: existing.assignedAgent
            ? `${existing.assignedAgent.firstName} ${existing.assignedAgent.lastName}`
            : undefined,
          toAgent:
            input.assignedAgentId !== undefined
              ? input.assignedAgentId
                ? "New Agent"
                : "Unassigned"
              : undefined,
          fromTeam: existing.assignedTeam?.name,
          toTeam:
            input.assignedTeamId !== undefined
              ? input.assignedTeamId
                ? "New Team"
                : "Unassigned"
              : undefined,
          referenceNumber: existing.referenceNumber,
        });

        if (input.assignedAgentId && input.assignedAgentId !== existing.assignedAgentId) {
          await notifyTicketAssigned({
            ticketId: input.id,
            referenceNumber: existing.referenceNumber,
            assignedUserId: input.assignedAgentId,
            organizationId: input.organizationId,
            assignedBy: input.updatedBy,
          });
        }
      }

      return updated;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        statusId: z.coerce.number(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.id),
        with: { status: true },
      });

      const updated = await updateTicketStatusWithSLA(input.id, input.statusId, input.updatedBy);

      if (updated && existing) {
        const newStatus = await db.query.lookups.findFirst({
          where: eq(lookups.id, input.statusId),
        });

        await logTicketStatusChange({
          ticketId: input.id,
          organizationId: input.organizationId,
          userId: input.updatedBy,
          fromStatus: existing.status?.label ?? "Unknown",
          toStatus: newStatus?.label ?? "Unknown",
          referenceNumber: existing.referenceNumber,
        });
      }

      return updated;
    }),

  updatePriority: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        priorityId: z.coerce.number(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.id),
        with: { priority: true },
      });

      const [updated] = await db
        .update(tickets)
        .set({
          priorityId: input.priorityId,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        })
        .where(eq(tickets.id, input.id))
        .returning();

      if (updated && existing) {
        const newPriority = await db.query.lookups.findFirst({
          where: eq(lookups.id, input.priorityId),
        });

        await logTicketPriorityChange({
          ticketId: input.id,
          organizationId: input.organizationId,
          userId: input.updatedBy,
          fromPriority: existing.priority?.label ?? "Unknown",
          toPriority: newPriority?.label ?? "Unknown",
          referenceNumber: existing.referenceNumber,
        });
      }

      return updated;
    }),

  lock: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        lockedBy: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(tickets)
        .set({
          isLocked: true,
          lockedBy: input.lockedBy,
          lockedAt: new Date(),
        })
        .where(eq(tickets.id, input.id))
        .returning();

      await logAudit({
        organizationId: input.organizationId,
        userId: input.lockedBy,
        action: "ticket.locked",
        resourceType: "ticket",
        resourceId: String(input.id),
      });

      return updated;
    }),

  unlock: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.id),
      });

      const [updated] = await db
        .update(tickets)
        .set({
          isLocked: false,
          lockedBy: null,
          lockedAt: null,
        })
        .where(eq(tickets.id, input.id))
        .returning();

      await logAudit({
        organizationId: input.organizationId,
        userId: ticket?.lockedBy ?? undefined,
        action: "ticket.unlocked",
        resourceType: "ticket",
        resourceId: String(input.id),
      });

      return updated;
    }),

  merge: publicProcedure
    .input(
      z.object({
        masterTicketId: z.coerce.number(),
        mergedTicketId: z.coerce.number(),
        organizationId: z.coerce.number(),
        mergedBy: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const masterTicket = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.masterTicketId),
      });

      const mergedTicket = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.mergedTicketId),
      });

      const [mergeRecord] = await db
        .insert(ticketMerges)
        .values({
          masterTicketId: input.masterTicketId,
          mergedTicketId: input.mergedTicketId,
          mergedBy: input.mergedBy,
        })
        .returning();

      await db
        .update(tickets)
        .set({
          isMerged: true,
          parentTicketId: input.masterTicketId,
          updatedAt: new Date(),
          updatedBy: input.mergedBy,
        })
        .where(eq(tickets.id, input.mergedTicketId));

      if (masterTicket && mergedTicket) {
        await logTicketMerge({
          masterTicketId: input.masterTicketId,
          mergedTicketId: input.mergedTicketId,
          organizationId: input.organizationId,
          userId: input.mergedBy,
          masterReference: masterTicket.referenceNumber,
          mergedReference: mergedTicket.referenceNumber,
        });
      }

      return mergeRecord;
    }),

  getTimeline: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        includePrivate: z.coerce.boolean().default(false),
      }),
    )
    .handler(async ({ input }) => {
      return await getTimeline(input.id, { includePrivate: input.includePrivate });
    }),

  getConversation: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        includePrivate: z.coerce.boolean().default(false),
      }),
    )
    .handler(async ({ input }) => {
      return await getConversationThread(input.ticketId, {
        includePrivate: input.includePrivate,
      });
    }),

  getNotes: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        includePrivate: z.coerce.boolean().default(true),
      }),
    )
    .handler(async ({ input }) => {
      return await getInternalNotes(input.ticketId, { includePrivate: input.includePrivate });
    }),

  addReply: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        organizationId: z.coerce.number(),
        bodyHtml: z.string(),
        bodyText: z.string().optional(),
        authorUserId: z.coerce.number(),
        isPrivate: z.coerce.boolean().default(false),
        savedReplyId: z.coerce.number().optional(),
        attachments: z
          .array(
            z.object({
              filename: z.string(),
              mimeType: z.string(),
              sizeBytes: z.coerce.number(),
              storageKey: z.string(),
            }),
          )
          .optional(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      let finalBodyHtml = input.bodyHtml;
      let finalBodyText = input.bodyText;

      if (input.savedReplyId) {
        const applied = await applySavedReply(
          input.savedReplyId,
          input.ticketId,
          input.authorUserId,
        );
        if (applied) {
          finalBodyHtml = applied.bodyHtml;
          finalBodyText = applied.bodyText;
        }
      }

      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.ticketId),
      });

      const message = await createMessage({
        ticketId: input.ticketId,
        authorType: AuthorType.AGENT,
        authorUserId: input.authorUserId,
        messageType: input.isPrivate ? MessageType.NOTE : MessageType.REPLY,
        bodyHtml: finalBodyHtml,
        bodyText: finalBodyText,
        isPrivate: input.isPrivate,
        attachments: input.attachments,
        createdBy: input.createdBy ?? input.authorUserId,
      });

      if (message && ticket) {
        await logMessageCreated({
          ticketId: input.ticketId,
          messageId: message.id,
          organizationId: input.organizationId,
          userId: input.authorUserId,
          messageType: input.isPrivate ? "note" : "reply",
          isPrivate: input.isPrivate,
          referenceNumber: ticket.referenceNumber,
        });
      }

      return message;
    }),

  addNote: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        organizationId: z.coerce.number(),
        bodyHtml: z.string(),
        bodyText: z.string().optional(),
        authorUserId: z.coerce.number(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.ticketId),
      });

      const message = await createMessage({
        ticketId: input.ticketId,
        authorType: AuthorType.AGENT,
        authorUserId: input.authorUserId,
        messageType: MessageType.NOTE,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText,
        isPrivate: true,
        createdBy: input.createdBy ?? input.authorUserId,
      });

      if (message && ticket) {
        await logMessageCreated({
          ticketId: input.ticketId,
          messageId: message.id,
          organizationId: input.organizationId,
          userId: input.authorUserId,
          messageType: "note",
          isPrivate: true,
          referenceNumber: ticket.referenceNumber,
        });
      }

      return message;
    }),

  addActivity: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        organizationId: z.coerce.number(),
        activityType: z.string(),
        description: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      return await createActivity({
        ticketId: input.ticketId,
        activityType: input.activityType,
        description: input.description,
        metadata: input.metadata,
        createdBy: input.createdBy,
      });
    }),

  bulkAssign: publicProcedure
    .input(
      z.object({
        ticketIds: z.array(z.coerce.number()),
        organizationId: z.coerce.number(),
        assignedAgentId: z.coerce.number().nullable().optional(),
        assignedTeamId: z.coerce.number().nullable().optional(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(tickets)
        .set({
          assignedAgentId: input.assignedAgentId,
          assignedTeamId: input.assignedTeamId,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        })
        .where(inArray(tickets.id, input.ticketIds));

      return { success: true, updated: input.ticketIds.length };
    }),

  bulkUpdateStatus: publicProcedure
    .input(
      z.object({
        ticketIds: z.array(z.coerce.number()),
        organizationId: z.coerce.number(),
        statusId: z.coerce.number(),
        updatedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      for (const ticketId of input.ticketIds) {
        await updateTicketStatusWithSLA(ticketId, input.statusId, input.updatedBy);
      }

      return { success: true, updated: input.ticketIds.length };
    }),

  bulkAddTags: publicProcedure
    .input(
      z.object({
        ticketIds: z.array(z.coerce.number()),
        tagIds: z.array(z.coerce.number()),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const values = input.ticketIds.flatMap((ticketId) =>
        input.tagIds.map((tagId) => ({
          ticketId,
          tagId,
          createdBy: input.createdBy,
        })),
      );

      await db.insert(ticketTags).values(values).onConflictDoNothing();

      return { success: true };
    }),

  bulkRemoveTags: publicProcedure
    .input(
      z.object({
        ticketIds: z.array(z.coerce.number()),
        tagIds: z.array(z.coerce.number()),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .delete(ticketTags)
        .where(
          and(
            inArray(ticketTags.ticketId, input.ticketIds),
            inArray(ticketTags.tagId, input.tagIds),
          ),
        );

      return { success: true };
    }),

  bulkDelete: publicProcedure
    .input(
      z.object({
        ticketIds: z.array(z.coerce.number()),
        organizationId: z.coerce.number(),
        deletedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(tickets)
        .set({
          deletedAt: new Date(),
          deletedBy: input.deletedBy,
        })
        .where(inArray(tickets.id, input.ticketIds));

      return { success: true, deleted: input.ticketIds.length };
    }),

  addFollower: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        userId: z.coerce.number(),
        createdBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [follower] = await db
        .insert(ticketFollowers)
        .values({
          ticketId: input.ticketId,
          userId: input.userId,
        })
        .onConflictDoNothing()
        .returning();

      if (follower) {
        await logAudit({
          organizationId: 0,
          userId: input.createdBy,
          action: "follower.added",
          resourceType: "ticket",
          resourceId: String(input.ticketId),
          metadata: { userId: input.userId },
        });
      }

      return follower;
    }),

  removeFollower: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        userId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .delete(ticketFollowers)
        .where(
          and(
            eq(ticketFollowers.ticketId, input.ticketId),
            eq(ticketFollowers.userId, input.userId),
          ),
        );

      await logAudit({
        organizationId: 0,
        action: "follower.removed",
        resourceType: "ticket",
        resourceId: String(input.ticketId),
        metadata: { userId: input.userId },
      });

      return { success: true };
    }),

  listSpam: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.tickets.findMany({
        where: and(
          eq(tickets.organizationId, input.organizationId),
          eq(tickets.isSpam, true),
          isNull(tickets.deletedAt),
        ),
        orderBy: [desc(tickets.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          contact: true,
          status: true,
          priority: true,
          channel: true,
          assignedAgent: true,
        },
      });
    }),

  markAsSpam: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        markedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(tickets)
        .set({
          isSpam: true,
          updatedAt: new Date(),
        })
        .where(and(eq(tickets.id, input.id), eq(tickets.organizationId, input.organizationId)))
        .returning();

      await logAudit({
        organizationId: input.organizationId,
        userId: input.markedBy,
        action: "ticket.spam_marked",
        resourceType: "ticket",
        resourceId: String(input.id),
      });

      return updated;
    }),

  markAsNotSpam: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        markedBy: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(tickets)
        .set({
          isSpam: false,
          updatedAt: new Date(),
        })
        .where(and(eq(tickets.id, input.id), eq(tickets.organizationId, input.organizationId)))
        .returning();

      await logAudit({
        organizationId: input.organizationId,
        userId: input.markedBy,
        action: "ticket.spam_unmarked",
        resourceType: "ticket",
        resourceId: String(input.id),
      });

      return updated;
    }),

  deletePermanent: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .delete(tickets)
        .where(
          and(
            eq(tickets.id, input.id),
            eq(tickets.organizationId, input.organizationId),
            eq(tickets.isSpam, true),
          ),
        );
      return { success: true };
    }),

  checkSpam: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const { detectSpam } = await import("../services/spamDetection");
      return await detectSpam(input.id);
    }),

  getAuditHistory: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      return await getTicketAuditHistory(input.ticketId, {
        limit: input.limit,
        offset: input.offset,
      });
    }),

  checkSLABreach: publicProcedure
    .input(
      z.object({
        ticketId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      await checkAndUpdateSLABreaches(input.ticketId);
      return { success: true };
    }),

  getSavedReplies: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        userId: z.coerce.number().optional(),
        folderId: z.coerce.number().optional(),
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        isNull(savedReplies.deletedAt),
        sql`(${savedReplies.scope} = 'organization' OR ${savedReplies.organizationId} = ${input.organizationId})`,
      ];

      if (input.folderId) {
        conditions.push(eq(savedReplies.folderId, input.folderId));
      }

      if (input.userId) {
        conditions.push(
          sql`(${savedReplies.scope} = 'personal' AND ${savedReplies.userId} = ${input.userId} OR ${savedReplies.scope} != 'personal')`,
        );
      }

      if (input.search) {
        conditions.push(
          sql`(${savedReplies.name} ILIKE ${`%${input.search}%`} OR ${savedReplies.bodyHtml} ILIKE ${`%${input.search}%`})`,
        );
      }

      return await db
        .select({
          id: savedReplies.id,
          uuid: savedReplies.uuid,
          name: savedReplies.name,
          subject: savedReplies.subject,
          bodyHtml: savedReplies.bodyHtml,
          shortcuts: savedReplies.shortcuts,
          scope: savedReplies.scope,
          folderId: savedReplies.folderId,
          createdAt: savedReplies.createdAt,
        })
        .from(savedReplies)
        .where(and(...conditions))
        .orderBy(desc(savedReplies.createdAt));
    }),

  applySavedReply: publicProcedure
    .input(
      z.object({
        savedReplyId: z.coerce.number(),
        ticketId: z.coerce.number(),
        agentId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await applySavedReply(input.savedReplyId, input.ticketId, input.agentId);
    }),
};
