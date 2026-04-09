import { db } from "@ticket-app/db";
import { chatbotConfigs, chatbotSessions, chatbotMessages } from "@ticket-app/db/schema";
import { eq, desc, and } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";
import {
  semanticSearchKB,
  processChatbotMessage,
  escalateChatbotSession,
  getChatbotSessionHistory,
  getChatbotAnalytics,
} from "../lib/chatbot";

export const chatbotRouter = {
  listConfigs: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(chatbotConfigs)
        .where(eq(chatbotConfigs.organizationId, input.organizationId))
        .orderBy(desc(chatbotConfigs.createdAt));
    }),

  getConfig: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [config] = await db.select().from(chatbotConfigs).where(eq(chatbotConfigs.id, input.id));
    return config ?? null;
  }),

  createConfig: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string(),
        isEnabled: z.boolean().default(false),
        escalationThreshold: z.number().min(1).max(10).default(3),
        responseDelaySeconds: z.number().min(0).max(60).default(5),
        workingHours: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [config] = await db
        .insert(chatbotConfigs)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          isEnabled: input.isEnabled,
          escalationThreshold: input.escalationThreshold,
          responseDelaySeconds: input.responseDelaySeconds,
          workingHours: input.workingHours,
        })
        .returning();
      return config;
    }),

  updateConfig: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        isEnabled: z.boolean().optional(),
        escalationThreshold: z.number().min(1).max(10).optional(),
        responseDelaySeconds: z.number().min(0).max(60).optional(),
        workingHours: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(chatbotConfigs)
        .set({
          name: input.name,
          isEnabled: input.isEnabled,
          escalationThreshold: input.escalationThreshold,
          responseDelaySeconds: input.responseDelaySeconds,
          workingHours: input.workingHours,
        })
        .where(eq(chatbotConfigs.id, input.id))
        .returning();
      return updated;
    }),

  deleteConfig: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(chatbotConfigs).where(eq(chatbotConfigs.id, input.id));
    return { success: true };
  }),

  configureChatbot: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string(),
        isEnabled: z.boolean(),
        escalationThreshold: z.number().min(1).max(10),
        responseDelaySeconds: z.number().min(0).max(60),
        workingHours: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.chatbotConfigs.findFirst({
        where: eq(chatbotConfigs.organizationId, input.organizationId),
      });

      if (existing) {
        const [updated] = await db
          .update(chatbotConfigs)
          .set({
            name: input.name,
            isEnabled: input.isEnabled,
            escalationThreshold: input.escalationThreshold,
            responseDelaySeconds: input.responseDelaySeconds,
            workingHours: input.workingHours,
          })
          .where(eq(chatbotConfigs.id, existing.id))
          .returning();
        return updated;
      }

      const [config] = await db
        .insert(chatbotConfigs)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          isEnabled: input.isEnabled,
          escalationThreshold: input.escalationThreshold,
          responseDelaySeconds: input.responseDelaySeconds,
          workingHours: input.workingHours,
        })
        .returning();
      return config;
    }),

  listSessions: publicProcedure
    .input(
      z.object({
        configId: z.number().optional(),
        contactId: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().default(50),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [];
      if (input.configId) conditions.push(eq(chatbotSessions.configId, input.configId));
      if (input.contactId) conditions.push(eq(chatbotSessions.contactId, input.contactId));
      if (input.status) conditions.push(eq(chatbotSessions.status, input.status));

      return await db
        .select()
        .from(chatbotSessions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(chatbotSessions.createdAt))
        .limit(input.limit);
    }),

  getSession: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [session] = await db
      .select()
      .from(chatbotSessions)
      .where(eq(chatbotSessions.id, input.id));
    return session ?? null;
  }),

  getSessionWithMessages: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const session = await db.query.chatbotSessions.findFirst({
        where: eq(chatbotSessions.id, input.id),
        with: {
          messages: {
            orderBy: [desc(chatbotMessages.createdAt)],
          },
        },
      });
      return session ?? null;
    }),

  createSession: publicProcedure
    .input(
      z.object({
        configId: z.number(),
        contactId: z.number(),
        ticketId: z.number().optional(),
        agentId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const config = await db.query.chatbotConfigs.findFirst({
        where: eq(chatbotConfigs.id, input.configId),
      });

      if (!config) {
        throw new Error("Chatbot configuration not found");
      }

      const [session] = await db
        .insert(chatbotSessions)
        .values({
          configId: input.configId,
          contactId: input.contactId,
          ticketId: input.ticketId,
          agentId: input.agentId,
          status: "active",
        })
        .returning();
      return session;
    }),

  processMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        message: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const response = await processChatbotMessage(input.sessionId, input.message);

      const session = await db.query.chatbotSessions.findFirst({
        where: eq(chatbotSessions.id, input.sessionId),
      });

      if (response.intent === "escalate" && session) {
        await db
          .update(chatbotSessions)
          .set({
            status: "escalated",
            escalatedAt: new Date(),
          })
          .where(eq(chatbotSessions.id, input.sessionId));
      }

      return response;
    }),

  escalateSession: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        agentId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      await escalateChatbotSession(input.sessionId, input.agentId);

      const session = await db.query.chatbotSessions.findFirst({
        where: eq(chatbotSessions.id, input.sessionId),
        with: {
          messages: {
            orderBy: [desc(chatbotMessages.createdAt)],
          },
        },
      });

      return {
        success: true,
        conversationHistory: await getChatbotSessionHistory(input.sessionId),
        lastMessage: session?.messages[0] || null,
      };
    }),

  endSession: publicProcedure
    .input(
      z.object({
        id: z.number(),
        endReason: z.enum(["resolved", "escalated", "abandoned"]).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(chatbotSessions)
        .set({
          status: input.endReason === "resolved" ? "resolved" : "escalated",
          resolvedAt: input.endReason === "resolved" ? new Date() : undefined,
          escalatedAt: input.endReason === "escalated" ? new Date() : undefined,
        })
        .where(eq(chatbotSessions.id, input.id))
        .returning();
      return updated;
    }),

  rateSession: publicProcedure
    .input(
      z.object({
        id: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(chatbotSessions)
        .set({
          rating: input.rating,
          ratingComment: input.comment,
        })
        .where(eq(chatbotSessions.id, input.id))
        .returning();
      return updated;
    }),

  listMessages: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(chatbotMessages)
        .where(eq(chatbotMessages.chatbotSessionId, input.sessionId))
        .orderBy(desc(chatbotMessages.createdAt));
    }),

  searchKB: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        query: z.string(),
        limit: z.number().default(5),
      }),
    )
    .handler(async ({ input }) => {
      return await semanticSearchKB(input.organizationId, input.query, input.limit);
    }),

  getAnalytics: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        days: z.number().default(30),
      }),
    )
    .handler(async ({ input }) => {
      return await getChatbotAnalytics(input.organizationId, input.days);
    }),
};
