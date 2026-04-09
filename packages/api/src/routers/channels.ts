import { db } from "@ticket-app/db";
import { channels } from "@ticket-app/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const channelsRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        isActive: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(channels.organizationId, input.organizationId),
        isNull(channels.deletedAt),
      ];

      if (input.isActive !== undefined) {
        conditions.push(eq(channels.isActive, input.isActive));
      }

      return await db.query.channels.findMany({
        where: and(...conditions),
        orderBy: [desc(channels.createdAt)],
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
      return await db.query.channels.findFirst({
        where: and(
          eq(channels.id, input.id),
          eq(channels.organizationId, input.organizationId),
          isNull(channels.deletedAt),
        ),
      });
    }),

  getByType: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        type: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.channels.findFirst({
        where: and(
          eq(channels.type, input.type),
          eq(channels.organizationId, input.organizationId),
          eq(channels.isActive, true),
          isNull(channels.deletedAt),
        ),
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(150),
        type: z.string().min(1).max(50),
        isActive: z.boolean().default(true),
      }),
    )
    .handler(async ({ input }) => {
      const [channel] = await db
        .insert(channels)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          type: input.type,
          isActive: input.isActive,
        })
        .returning();

      return channel;
    }),
};
