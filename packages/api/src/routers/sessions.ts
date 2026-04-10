import { db } from "@ticket-app/db";
import { userSessions } from "@ticket-app/db/schema";
import { eq, and, isNull, desc, gte, sql } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const sessionsRouter = {
  list: publicProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
        organizationId: z.coerce.number(),
        includeRevoked: z.coerce.boolean().default(false),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [eq(userSessions.userId, input.userId)];

      if (!input.includeRevoked) {
        conditions.push(isNull(userSessions.revokedAt));
      }

      return await db.query.userSessions.findMany({
        where: and(...conditions),
        orderBy: [desc(userSessions.lastActivityAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }),

  revoke: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        userId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(userSessions)
        .set({
          revokedAt: new Date(),
        })
        .where(and(eq(userSessions.id, input.id), eq(userSessions.userId, input.userId)))
        .returning();

      return updated;
    }),

  revokeAll: publicProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
        exceptSessionId: z.coerce.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [eq(userSessions.userId, input.userId), isNull(userSessions.revokedAt)];

      if (input.exceptSessionId) {
        conditions.push(sql`${userSessions.id} != ${input.exceptSessionId}`);
      }

      await db
        .update(userSessions)
        .set({
          revokedAt: new Date(),
        })
        .where(and(...conditions));

      return { success: true };
    }),

  getActive: publicProcedure
    .input(
      z.object({
        userId: z.coerce.number(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.userSessions.findMany({
        where: and(
          eq(userSessions.userId, input.userId),
          isNull(userSessions.revokedAt),
          gte(userSessions.expiresAt, new Date()),
        ),
        orderBy: [desc(userSessions.lastActivityAt)],
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }),

  extend: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
        userId: z.coerce.number(),
        extendByHours: z.coerce.number().min(1).max(168).default(24),
      }),
    )
    .handler(async ({ input }) => {
      const newExpiry = new Date();
      newExpiry.setHours(newExpiry.getHours() + input.extendByHours);

      const [updated] = await db
        .update(userSessions)
        .set({
          expiresAt: newExpiry,
          lastActivityAt: new Date(),
        })
        .where(and(eq(userSessions.id, input.id), eq(userSessions.userId, input.userId)))
        .returning();

      return updated;
    }),
};
