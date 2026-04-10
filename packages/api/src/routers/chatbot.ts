import { db } from "@ticket-app/db";
import { chatbotConfigs, chatbotSessions, chatbotMessages } from "@ticket-app/db/schema";
import { eq, desc, and } from "drizzle-orm";
import * as z from "zod";

import { protectedProcedure } from "../index";
import {
  hasPermission,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  buildPermissionKey,
} from "../services/rbac";
import {
  semanticSearchKB,
  processChatbotMessage,
  escalateChatbotSession,
  getChatbotSessionHistory,
  getChatbotAnalytics,
} from "../lib/chatbot";

export const chatbotRouter = {
  listConfigs: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Chatbot read permission required");
      }

      return await db
        .select()
        .from(chatbotConfigs)
        .where(eq(chatbotConfigs.organizationId, input.organizationId))
        .orderBy(desc(chatbotConfigs.createdAt));
    }),

  getConfig: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Chatbot read permission required");
      }

      const [config] = await db
        .select()
        .from(chatbotConfigs)
        .where(eq(chatbotConfigs.id, input.id));
      return config ?? null;
    }),

  createConfig: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        name: z.string(),
        isEnabled: z.coerce.boolean().default(false),
        escalationThreshold: z.coerce.number().min(1).max(10).default(3),
        responseDelaySeconds: z.coerce.number().min(0).max(60).default(5),
        workingHours: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Chatbot write permission required");
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

  updateConfig: protectedProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        organizationId: z.coerce.number(),
        name: z.string().optional(),
        isEnabled: z.coerce.boolean().optional(),
        escalationThreshold: z.coerce.number().min(1).max(10).optional(),
        responseDelaySeconds: z.coerce.number().min(0).max(60).optional(),
        workingHours: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Chatbot write permission required");
      }

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

  deleteConfig: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Chatbot write permission required");
      }

      await db.delete(chatbotConfigs).where(eq(chatbotConfigs.id, input.id));
      return { success: true };
    }),

  configureChatbot: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        name: z.string(),
        isEnabled: z.coerce.boolean(),
        escalationThreshold: z.coerce.number().min(1).max(10),
        responseDelaySeconds: z.coerce.number().min(0).max(60),
        workingHours: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Chatbot write permission required");
      }

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

  listSessions: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        configId: z.coerce.number().optional(),
        contactId: z.coerce.number().optional(),
        status: z.string().optional(),
        limit: z.coerce.number().default(50),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Chatbot read permission required");
      }

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

  getSession: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Chatbot read permission required");
      }

      const [session] = await db
        .select()
        .from(chatbotSessions)
        .where(eq(chatbotSessions.id, input.id));
      return session ?? null;
    }),

  getSessionWithMessages: protectedProcedure
    .input(z.object({ id: z.coerce.number(), organizationId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Chatbot read permission required");
      }

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

  createSession: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        configId: z.coerce.number(),
        contactId: z.coerce.number(),
        ticketId: z.coerce.number().optional(),
        agentId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Chatbot write permission required");
      }

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

  processMessage: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        sessionId: z.coerce.number(),
        message: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Chatbot write permission required");
      }

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

  escalateSession: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        sessionId: z.coerce.number(),
        agentId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Chatbot write permission required");
      }

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

  endSession: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
        endReason: z.enum(["resolved", "escalated", "abandoned"]).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Chatbot write permission required");
      }

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

  rateSession: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
        rating: z.coerce.number().min(1).max(5),
        comment: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const canWrite = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.WRITE),
      );

      if (!canWrite) {
        throw new Error("Unauthorized: Chatbot write permission required");
      }

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

  listMessages: protectedProcedure
    .input(z.object({ organizationId: z.coerce.number(), sessionId: z.coerce.number() }))
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Chatbot read permission required");
      }

      return await db
        .select()
        .from(chatbotMessages)
        .where(eq(chatbotMessages.chatbotSessionId, input.sessionId))
        .orderBy(desc(chatbotMessages.createdAt));
    }),

  searchKB: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        query: z.string(),
        limit: z.coerce.number().default(5),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Chatbot read permission required");
      }

      return await semanticSearchKB(input.organizationId, input.query, input.limit);
    }),

  getAnalytics: protectedProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        days: z.coerce.number().default(30),
      }),
    )
    .handler(async ({ input, context }) => {
      const canRead = await hasPermission(
        {
          userId: Number(context.auth.userId),
          organizationId: input.organizationId,
        },
        buildPermissionKey(PERMISSION_GROUPS.CHATBOT, PERMISSION_ACTIONS.READ),
      );

      if (!canRead) {
        throw new Error("Unauthorized: Chatbot read permission required");
      }

      return await getChatbotAnalytics(input.organizationId, input.days);
    }),
};
