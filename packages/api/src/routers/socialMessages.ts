import { db } from "@ticket-app/db";
import { socialMessages } from "@ticket-app/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const socialMessagesRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        socialAccountId: z.coerce.number().optional(),
        platform: z.string().optional(),
        ticketId: z.coerce.number().optional(),
        isIncoming: z.coerce.boolean().optional(),
        isSpam: z.coerce.boolean().optional(),
        search: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        sql`${socialMessages.socialAccountId} IN (
          SELECT id FROM social_accounts WHERE organization_id = ${input.organizationId}
        )`,
        isNull(socialMessages.deletedAt),
      ];

      if (input.socialAccountId) {
        conditions.push(eq(socialMessages.socialAccountId, input.socialAccountId));
      }
      if (input.platform) {
        conditions.push(eq(socialMessages.platform, input.platform));
      }
      if (input.ticketId) {
        conditions.push(eq(socialMessages.ticketId, input.ticketId));
      }
      if (input.isIncoming !== undefined) {
        conditions.push(eq(socialMessages.isIncoming, input.isIncoming));
      }
      if (input.isSpam !== undefined) {
        conditions.push(eq(socialMessages.isSpam, input.isSpam));
      }
      if (input.search) {
        conditions.push(sql`${socialMessages.bodyText} ILIKE ${`%${input.search}%`}`);
      }

      return await db.query.socialMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(socialMessages.sentAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          socialAccount: {
            columns: {
              id: true,
              platform: true,
              platformUsername: true,
            },
          },
        },
      });
    }),

  get: publicProcedure
    .input(
      z.object({
        organizationId: z.coerce.number(),
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const message = await db.query.socialMessages.findFirst({
        where: and(eq(socialMessages.id, input.id), isNull(socialMessages.deletedAt)),
        with: {
          socialAccount: {
            columns: {
              id: true,
              platform: true,
              platformUsername: true,
              platformAccountId: true,
            },
          },
        },
      });

      if (!message) return null;

      const account = await db.query.socialAccounts.findFirst({
        where: eq(db.query.socialAccounts.fields.id, message.socialAccountId),
      });

      if (!account || account.organizationId !== input.organizationId) {
        return null;
      }

      return message;
    }),

  getByPlatformMessageId: publicProcedure
    .input(
      z.object({
        socialAccountId: z.coerce.number(),
        platformMessageId: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.socialMessages.findFirst({
        where: and(
          eq(socialMessages.socialAccountId, input.socialAccountId),
          eq(socialMessages.platformMessageId, input.platformMessageId),
          isNull(socialMessages.deletedAt),
        ),
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        socialAccountId: z.coerce.number(),
        platform: z.string(),
        platformMessageId: z.string(),
        platformParentMessageId: z.string().optional(),
        authorPlatformUserId: z.string().optional(),
        authorUsername: z.string().optional(),
        authorName: z.string().optional(),
        authorAvatarUrl: z.url().optional(),
        messageType: z.string(),
        bodyText: z.string(),
        bodyHtml: z.string().optional(),
        mediaUrls: z.array(z.string()).optional(),
        linkUrls: z.array(z.string()).optional(),
        isIncoming: z.coerce.boolean().default(true),
        isSpam: z.coerce.boolean().default(false),
        sentAt: z.string().datetime().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [message] = await db
        .insert(socialMessages)
        .values({
          socialAccountId: input.socialAccountId,
          platform: input.platform,
          platformMessageId: input.platformMessageId,
          platformParentMessageId: input.platformParentMessageId,
          authorPlatformUserId: input.authorPlatformUserId,
          authorUsername: input.authorUsername,
          authorName: input.authorName,
          authorAvatarUrl: input.authorAvatarUrl,
          messageType: input.messageType,
          bodyText: input.bodyText,
          bodyHtml: input.bodyHtml,
          mediaUrls: input.mediaUrls,
          linkUrls: input.linkUrls,
          isIncoming: input.isIncoming,
          isSpam: input.isSpam,
          sentAt: input.sentAt ? new Date(input.sentAt) : new Date(),
        })
        .returning();

      return message;
    }),

  linkToTicket: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        ticketId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [message] = await db
        .update(socialMessages)
        .set({
          ticketId: input.ticketId,
          updatedAt: new Date(),
        })
        .where(eq(socialMessages.id, input.id))
        .returning();

      return message;
    }),

  markAsSpam: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        isSpam: z.coerce.boolean(),
      }),
    )
    .handler(async ({ input }) => {
      const [message] = await db
        .update(socialMessages)
        .set({
          isSpam: input.isSpam,
          updatedAt: new Date(),
        })
        .where(eq(socialMessages.id, input.id))
        .returning();

      return message;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(socialMessages)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(socialMessages.id, input.id));

      return { success: true };
    }),

  getConversation: publicProcedure
    .input(
      z.object({
        socialAccountId: z.coerce.number(),
        authorPlatformUserId: z.string(),
        limit: z.coerce.number().min(1).max(100).default(20),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.socialMessages.findMany({
        where: and(
          eq(socialMessages.socialAccountId, input.socialAccountId),
          eq(socialMessages.authorPlatformUserId, input.authorPlatformUserId),
          isNull(socialMessages.deletedAt),
        ),
        orderBy: [desc(socialMessages.sentAt)],
        limit: input.limit,
      });
    }),
};
