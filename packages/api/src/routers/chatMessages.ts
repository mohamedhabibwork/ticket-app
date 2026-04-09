import { db } from "@ticket-app/db";
import { chatMessages, chatSessions, chatMessageReactions } from "@ticket-app/db/schema";
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

  send: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        authorType: z.enum(["agent", "contact"]),
        authorUserId: z.number().optional(),
        authorContactId: z.number().optional(),
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

      if (session.status === "ended") {
        throw new Error("Cannot send message to ended session");
      }

      const [message] = await db
        .insert(chatMessages)
        .values({
          sessionId: input.sessionId,
          authorType: input.authorType,
          authorUserId: input.authorUserId,
          authorContactId: input.authorContactId,
          messageType: "text",
          body: input.body,
          attachments: input.attachments ?? [],
        })
        .returning();

      const { publishChatMessage } = await import("../services/chatPubSub");
      await publishChatMessage({
        sessionId: input.sessionId,
        message,
      });

      return message;
    }),

  addReaction: publicProcedure
    .input(
      z.object({
        messageId: z.number(),
        userId: z.number().optional(),
        contactId: z.number().optional(),
        reaction: z.string().min(1).max(50),
      })
    )
    .handler(async ({ input }) => {
      const message = await db.query.chatMessages.findFirst({
        where: eq(chatMessages.id, input.messageId),
      });

      if (!message) {
        throw new Error("Message not found");
      }

      const existing = await db.query.chatMessageReactions?.findFirst({
        where: and(
          eq(chatMessageReactions.messageId, input.messageId),
          eq(chatMessageReactions.userId, input.userId ?? 0),
          eq(chatMessageReactions.contactId, input.contactId ?? 0),
        ),
      });

      if (existing) {
        const [updated] = await db
          .update(chatMessageReactions)
          .set({ reaction: input.reaction })
          .where(eq(chatMessageReactions.id, existing.id))
          .returning();
        return updated;
      }

      const [reaction] = await db
        .insert(chatMessageReactions)
        .values({
          messageId: input.messageId,
          userId: input.userId,
          contactId: input.contactId,
          reaction: input.reaction,
        })
        .returning();

      return reaction;
    }),
};
