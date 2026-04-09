import { db } from "@ticket-app/db";
import { chatbotConfigs, chatbotSessions, chatbotMessages } from "@ticket-app/db/schema";
import { eq, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

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

  getConfig: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const [config] = await db
        .select()
        .from(chatbotConfigs)
        .where(eq(chatbotConfigs.id, input.id));
      return config ?? null;
    }),

  createConfig: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string(),
        kbArticleIds: z.array(z.number()).optional(),
        confidenceThreshold: z.number().min(0).max(1).default(0.7),
        maxEscalationDelay: z.number().default(300),
        welcomeMessage: z.string().optional(),
        escalationMessage: z.string().optional(),
        isActive: z.boolean().default(true),
        createdBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [config] = await db
        .insert(chatbotConfigs)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          kbArticleIds: input.kbArticleIds,
          confidenceThreshold: input.confidenceThreshold,
          maxEscalationDelay: input.maxEscalationDelay,
          welcomeMessage: input.welcomeMessage,
          escalationMessage: input.escalationMessage,
          isActive: input.isActive,
          createdBy: input.createdBy,
        })
        .returning();
      return config;
    }),

  updateConfig: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        kbArticleIds: z.array(z.number()).optional(),
        confidenceThreshold: z.number().min(0).max(1).optional(),
        maxEscalationDelay: z.number().optional(),
        welcomeMessage: z.string().optional(),
        escalationMessage: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(chatbotConfigs)
        .set({
          name: input.name,
          kbArticleIds: input.kbArticleIds,
          confidenceThreshold: input.confidenceThreshold,
          maxEscalationDelay: input.maxEscalationDelay,
          welcomeMessage: input.welcomeMessage,
          escalationMessage: input.escalationMessage,
          isActive: input.isActive,
        })
        .where(eq(chatbotConfigs.id, input.id))
        .returning();
      return updated;
    }),

  deleteConfig: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      await db.delete(chatbotConfigs).where(eq(chatbotConfigs.id, input.id));
      return { success: true };
    }),

  listSessions: publicProcedure
    .input(z.object({ configId: z.number().optional(), contactId: z.number().optional() }))
    .handler(async ({ input }) => {
      const conditions = [];
      if (input.configId) conditions.push(eq(chatbotSessions.configId, input.configId));
      if (input.contactId) conditions.push(eq(chatbotSessions.contactId, input.contactId));
      return await db
        .select()
        .from(chatbotSessions)
        .where(conditions.length ? conditions[0] : undefined)
        .orderBy(desc(chatbotSessions.createdAt));
    }),

  getSession: publicProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const [session] = await db
        .select()
        .from(chatbotSessions)
        .where(eq(chatbotSessions.id, input.id));
      return session ?? null;
    }),

  createSession: publicProcedure
    .input(
      z.object({
        configId: z.number(),
        contactId: z.number(),
        agentId: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [session] = await db
        .insert(chatbotSessions)
        .values({
          configId: input.configId,
          contactId: input.contactId,
          agentId: input.agentId,
        })
        .returning();
      return session;
    }),

  endSession: publicProcedure
    .input(
      z.object({
        id: z.number(),
        escalatedToAgentId: z.number().optional(),
        endReason: z.enum(["resolved", "escalated", "abandoned"]).optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(chatbotSessions)
        .set({
          endedAt: new Date(),
          escalatedToAgentId: input.escalatedToAgentId,
          endReason: input.endReason,
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
        .where(eq(chatbotMessages.sessionId, input.sessionId))
        .orderBy(desc(chatbotMessages.createdAt));
    }),

  createMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        authorType: z.enum(["user", "bot"]),
        content: z.string(),
        confidence: z.number().optional(),
        kbArticleId: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [message] = await db
        .insert(chatbotMessages)
        .values(input)
        .returning();
      return message;
    }),
};
