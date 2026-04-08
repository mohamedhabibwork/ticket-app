import { db } from "@ticket-app/db";
import { chatSessions, chatWidgets, chatMessages, lookups } from "@ticket-app/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const chatSessionsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        widgetId: z.number().optional(),
        status: z.string().optional(),
        agentId: z.number().optional(),
        contactId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(chatSessions.organizationId, input.organizationId),
      ];

      if (input.widgetId) conditions.push(eq(chatSessions.widgetId, input.widgetId));
      if (input.status) conditions.push(eq(chatSessions.status, input.status));
      if (input.agentId) conditions.push(eq(chatSessions.agentId, input.agentId));
      if (input.contactId) conditions.push(eq(chatSessions.contactId, input.contactId));

      return await db.query.chatSessions.findMany({
        where: and(...conditions),
        orderBy: [desc(chatSessions.startedAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          contact: true,
          agent: true,
          widget: true,
        },
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.id, input.id),
          eq(chatSessions.organizationId, input.organizationId)
        ),
        with: {
          contact: true,
          agent: true,
          widget: true,
          messages: {
            orderBy: [desc(chatMessages.createdAt)],
            with: {
              authorUser: true,
              authorContact: true,
            },
          },
        },
      });
    }),

  getByUuid: publicProcedure
    .input(
      z.object({
        uuid: z.string(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.uuid, input.uuid)
        ),
        with: {
          contact: true,
          agent: true,
          widget: true,
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        widgetId: z.number(),
        organizationId: z.number(),
        contactId: z.number().optional(),
        preChatData: z.record(z.any()).optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [session] = await db
        .insert(chatSessions)
        .values({
          widgetId: input.widgetId,
          organizationId: input.organizationId,
          contactId: input.contactId,
          status: "waiting",
          preChatData: input.preChatData ?? {},
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        })
        .returning();

      return session;
    }),

  assignAgent: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        agentId: z.number(),
        updatedBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(chatSessions)
        .set({
          agentId: input.agentId,
          status: "active",
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        })
        .where(
          and(
            eq(chatSessions.id, input.id),
            eq(chatSessions.organizationId, input.organizationId)
          )
        )
        .returning();

      return updated;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        status: z.enum(["waiting", "active", "ended", "converted"]),
        endedBy: z.enum(["agent", "contact", "system"]).optional(),
        updatedBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const updates: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      };

      if (input.status === "ended") {
        updates.endedAt = new Date();
        updates.endedBy = input.endedBy;
      }

      const [updated] = await db
        .update(chatSessions)
        .set(updates)
        .where(
          and(
            eq(chatSessions.id, input.id),
            eq(chatSessions.organizationId, input.organizationId)
          )
        )
        .returning();

      return updated;
    }),

  linkTicket: publicProcedure
    .input(
      z.object({
        id: z.number(),
        organizationId: z.number(),
        ticketId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(chatSessions)
        .set({
          ticketId: input.ticketId,
          status: "converted",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(chatSessions.id, input.id),
            eq(chatSessions.organizationId, input.organizationId)
          )
        )
        .returning();

      return updated;
    }),

  setRating: publicProcedure
    .input(
      z.object({
        id: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(chatSessions)
        .set({
          rating: input.rating,
          ratingComment: input.comment,
          updatedAt: new Date(),
        })
        .where(eq(chatSessions.id, input.id))
        .returning();

      return updated;
    }),

  getActiveByContact: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        contactId: z.number(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.organizationId, input.organizationId),
          eq(chatSessions.contactId, input.contactId),
          sql`${chatSessions.status} IN ('waiting', 'active')`
        ),
        orderBy: [desc(chatSessions.startedAt)],
        with: {
          widget: true,
          messages: {
            orderBy: [desc(chatMessages.createdAt)],
            limit: 50,
          },
        },
      });
    }),

  getActiveSessions: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        widgetId: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(chatSessions.organizationId, input.organizationId),
        sql`${chatSessions.status} IN ('waiting', 'active')`,
      ];

      if (input.widgetId) {
        conditions.push(eq(chatSessions.widgetId, input.widgetId));
      }

      return await db.query.chatSessions.findMany({
        where: and(...conditions),
        orderBy: [desc(chatSessions.startedAt)],
        with: {
          contact: true,
          agent: true,
          widget: true,
        },
      });
    }),

  getStats: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        widgetId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(chatSessions.organizationId, input.organizationId),
      ];

      if (input.widgetId) {
        conditions.push(eq(chatSessions.widgetId, input.widgetId));
      }

      const sessions = await db.query.chatSessions.findMany({
        where: and(...conditions),
      });

      const totalSessions = sessions.length;
      const activeSessions = sessions.filter(s => s.status === "active" || s.status === "waiting").length;
      const endedSessions = sessions.filter(s => s.status === "ended").length;
      const convertedSessions = sessions.filter(s => s.status === "converted").length;
      const avgRating = sessions
        .filter(s => s.rating != null)
        .reduce((acc, s, _, arr) => acc + (s.rating ?? 0) / arr.length, 0);

      return {
        totalSessions,
        activeSessions,
        endedSessions,
        convertedSessions,
        conversionRate: totalSessions > 0 ? (convertedSessions / totalSessions) * 100 : 0,
        averageRating: avgRating || null,
      };
    }),
};
