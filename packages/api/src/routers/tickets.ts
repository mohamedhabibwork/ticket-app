import { db } from "@ticket-app/db";
import {
  tickets,
  ticketMessages,
  ticketCc,
  ticketTags,
  ticketMerges,
  ticketFollowers,
  lookups,
  tags,
  users,
} from "@ticket-app/db/schema";
import { eq, and, isNull, desc, sql, inArray } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";
import { generateReferenceNumber } from "../lib/reference";

export const ticketsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        statusId: z.number().optional(),
        priorityId: z.number().optional(),
        channelId: z.number().optional(),
        assignedAgentId: z.number().optional(),
        contactId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
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
      if (input.search) {
        conditions.push(sql`${tickets.subject} ILIKE ${`%${input.search}%`}`);
      }

      return await db.query.tickets.findMany({
        where: and(...conditions),
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

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
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
            },
          },
          cc: true,
        },
      });

      return ticket;
    }),

  getByReference: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
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
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        subject: z.string().min(1).max(500),
        descriptionHtml: z.string().optional(),
        descriptionText: z.string().optional(),
        statusId: z.number().optional(),
        priorityId: z.number().optional(),
        channelId: z.number().optional(),
        contactId: z.number().optional(),
        assignedAgentId: z.number().optional(),
        assignedTeamId: z.number().optional(),
        mailboxId: z.number().optional(),
        formSubmissionId: z.number().optional(),
        parentTicketId: z.number().optional(),
        ccEmails: z.array(z.string().email()).optional(),
        bccEmails: z.array(z.string().email()).optional(),
        isSpam: z.boolean().default(false),
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
        })
        .returning();

      if (input.ccEmails && input.ccEmails.length > 0) {
        await db.insert(ticketCc).values(
          input.ccEmails.map((email) => ({
            ticketId: ticket.id,
            email: email.toLowerCase(),
          })),
        );
      }

      return ticket;
    }),

  addCc: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        email: z.string().email(),
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
      return cc;
    }),

  removeCc: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        email: z.string().email(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .delete(ticketCc)
        .where(
          and(eq(ticketCc.ticketId, input.ticketId), eq(ticketCc.email, input.email.toLowerCase())),
        );
      return { success: true };
    }),

  assign: publicProcedure
    .input(
      z.object({
        id: z.number(),
        assignedAgentId: z.number().nullable().optional(),
        assignedTeamId: z.number().nullable().optional(),
        updatedBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
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
      return updated;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        statusId: z.number(),
        updatedBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const status = await db.query.lookups.findFirst({
        where: eq(lookups.id, input.statusId),
      });

      const updates: Record<string, unknown> = {
        statusId: input.statusId,
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      };

      if (status?.metadata && typeof status.metadata === "object") {
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
        .where(eq(tickets.id, input.id))
        .returning();
      return updated;
    }),

  updatePriority: publicProcedure
    .input(
      z.object({
        id: z.number(),
        priorityId: z.number(),
        updatedBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(tickets)
        .set({
          priorityId: input.priorityId,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        })
        .where(eq(tickets.id, input.id))
        .returning();
      return updated;
    }),

  lock: publicProcedure
    .input(
      z.object({
        id: z.number(),
        lockedBy: z.number(),
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
      return updated;
    }),

  unlock: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(tickets)
        .set({
          isLocked: false,
          lockedBy: null,
          lockedAt: null,
        })
        .where(eq(tickets.id, input.id))
        .returning();
      return updated;
    }),

  merge: publicProcedure
    .input(
      z.object({
        masterTicketId: z.number(),
        mergedTicketId: z.number(),
        mergedBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
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

      return mergeRecord;
    }),

  getTimeline: publicProcedure
    .input(
      z.object({
        id: z.number(),
        includePrivate: z.boolean().default(false),
      }),
    )
    .handler(async ({ input }) => {
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.id),
        with: {
          contact: true,
          status: true,
          priority: true,
          channel: true,
          assignedAgent: true,
          assignedTeam: true,
        },
      });

      if (!ticket) return null;

      const messageConditions = [eq(ticketMessages.ticketId, input.id)];

      if (!input.includePrivate) {
        messageConditions.push(eq(ticketMessages.isPrivate, false));
      }

      const messages = await db
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
          authorEmail: users.email,
          authorAvatarUrl: users.avatarUrl,
        })
        .from(ticketMessages)
        .leftJoin(users, eq(ticketMessages.authorUserId, users.id))
        .where(and(...messageConditions))
        .orderBy(desc(ticketMessages.createdAt));

      const ticketTagsList = await db
        .select({
          id: tags.id,
          uuid: tags.uuid,
          name: tags.name,
          color: tags.color,
        })
        .from(tags)
        .innerJoin(ticketTags, eq(ticketTags.tagId, tags.id))
        .where(eq(ticketTags.ticketId, input.id));

      const followers = await db
        .select({
          id: ticketFollowers.id,
          userId: ticketFollowers.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(ticketFollowers)
        .innerJoin(users, eq(ticketFollowers.userId, users.id))
        .where(eq(ticketFollowers.ticketId, input.id));

      return {
        ...ticket,
        messages,
        tags: ticketTagsList,
        followers,
      };
    }),

  bulkAssign: publicProcedure
    .input(
      z.object({
        ticketIds: z.array(z.number()),
        assignedAgentId: z.number().nullable().optional(),
        assignedTeamId: z.number().nullable().optional(),
        updatedBy: z.number().optional(),
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
        ticketIds: z.array(z.number()),
        statusId: z.number(),
        updatedBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(tickets)
        .set({
          statusId: input.statusId,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        })
        .where(inArray(tickets.id, input.ticketIds));

      return { success: true, updated: input.ticketIds.length };
    }),

  bulkAddTags: publicProcedure
    .input(
      z.object({
        ticketIds: z.array(z.number()),
        tagIds: z.array(z.number()),
        createdBy: z.number().optional(),
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
        ticketIds: z.array(z.number()),
        tagIds: z.array(z.number()),
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
        ticketIds: z.array(z.number()),
        deletedBy: z.number().optional(),
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
        ticketId: z.number(),
        userId: z.number(),
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
      return follower;
    }),

  removeFollower: publicProcedure
    .input(
      z.object({
        ticketId: z.number(),
        userId: z.number(),
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
      return { success: true };
    }),

  listSpam: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
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
        id: z.number(),
        organizationId: z.number(),
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
      return updated;
    }),

  markAsNotSpam: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
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
      return updated;
    }),

  deletePermanent: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
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
        id: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const { detectSpam } = await import("../services/spamDetection");
      return await detectSpam(input.id);
    }),
};
