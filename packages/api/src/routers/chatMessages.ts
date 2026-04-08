import { db } from "@ticket-app/db";
import { chatMessages, chatSessions } from "@ticket-app/db/schema";
import { eq, and, desc } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const chatMessagesRouter = {
  list: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.chatMessages.findMany({
        where: eq(chatMessages.sessionId, input.sessionId),
        orderBy: [desc(chatMessages.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          authorUser: true,
          authorContact: true,
        },
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .handler(async ({ input }) => {
      return await db.query.chatMessages.findFirst({
        where: eq(chatMessages.id, input.id),
        with: {
          authorUser: true,
          authorContact: true,
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        authorType: z.enum(["agent", "contact", "system"]),
        authorUserId: z.number().optional(),
        authorContactId: z.number().optional(),
        messageType: z.enum(["text", "file", "system"]).default("text"),
        body: z.string(),
        attachments: z.array(z.object({
          name: z.string(),
          url: z.string(),
          mimeType: z.string(),
          sizeBytes: z.number(),
        })).optional(),
        isSystem: z.boolean().default(false),
      })
    )
    .handler(async ({ input }) => {
      const [message] = await db
        .insert(chatMessages)
        .values({
          sessionId: input.sessionId,
          authorType: input.authorType,
          authorUserId: input.authorUserId,
          authorContactId: input.authorContactId,
          messageType: input.messageType,
          body: input.body,
          attachments: input.attachments ?? [],
          isSystem: input.isSystem,
        })
        .returning();

      return message;
    }),

  createFromContact: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        body: z.string(),
        attachments: z.array(z.object({
          name: z.string(),
          url: z.string(),
          mimeType: z.string(),
          sizeBytes: z.number(),
        })).optional(),
      })
    )
    .handler(async ({ input }) => {
      const session = await db.query.chatSessions.findFirst({
        where: eq(chatSessions.id, input.sessionId),
      });

      if (!session) {
        throw new Error("Session not found");
      }

      const [message] = await db
        .insert(chatMessages)
        .values({
          sessionId: input.sessionId,
          authorType: "contact",
          authorContactId: session.contactId,
          messageType: "text",
          body: input.body,
          attachments: input.attachments ?? [],
        })
        .returning();

      return message;
    }),

  createFromAgent: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        agentId: z.number(),
        body: z.string(),
        attachments: z.array(z.object({
          name: z.string(),
          url: z.string(),
          mimeType: z.string(),
          sizeBytes: z.number(),
        })).optional(),
      })
    )
    .handler(async ({ input }) => {
      const [message] = await db
        .insert(chatMessages)
        .values({
          sessionId: input.sessionId,
          authorType: "agent",
          authorUserId: input.agentId,
          messageType: "text",
          body: input.body,
          attachments: input.attachments ?? [],
        })
        .returning();

      return message;
    }),

  createSystemMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        body: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const [message] = await db
        .insert(chatMessages)
        .values({
          sessionId: input.sessionId,
          authorType: "system",
          messageType: "system",
          body: input.body,
          isSystem: true,
        })
        .returning();

      return message;
    }),

  getRecent: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        sinceId: z.number().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .handler(async ({ input }) => {
      const conditions = [eq(chatMessages.sessionId, input.sessionId)];

      return await db.query.chatMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(chatMessages.createdAt)],
        limit: input.limit,
        with: {
          authorUser: true,
          authorContact: true,
        },
      });
    }),
};
