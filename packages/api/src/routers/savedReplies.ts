import { db } from "@ticket-app/db";
import { savedReplies, savedReplyFolders } from "@ticket-app/db/schema";
import { eq, desc, or, sql } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";

export const savedRepliesRouter = {
  list: publicProcedure
    .input(z.object({ organizationId: z.number(), userId: z.number().optional() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(savedReplies)
        .where(
          or(
            eq(savedReplies.organizationId, input.organizationId),
            eq(savedReplies.userId, input.userId ?? 0),
          ),
        )
        .orderBy(desc(savedReplies.createdAt));
    }),

  listFolders: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      return await db
        .select()
        .from(savedReplyFolders)
        .where(eq(savedReplyFolders.organizationId, input.organizationId))
        .orderBy(desc(savedReplyFolders.createdAt));
    }),

  get: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [reply] = await db.select().from(savedReplies).where(eq(savedReplies.id, input.id));
    return reply ?? null;
  }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(150),
        subject: z.string().max(255).optional(),
        bodyHtml: z.string(),
        bodyText: z.string().optional(),
        shortcuts: z.string().max(100).optional(),
        scope: z.enum(["personal", "team", "organization"]).default("personal"),
        folderId: z.number().optional(),
        userId: z.number().optional(),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [reply] = await db
        .insert(savedReplies)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          shortcuts: input.shortcuts,
          scope: input.scope,
          folderId: input.folderId,
          userId: input.userId,
          createdBy: input.createdBy,
        })
        .returning();
      return reply;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(150).optional(),
        subject: z.string().max(255).optional(),
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
        shortcuts: z.string().max(100).optional(),
        scope: z.enum(["personal", "team", "organization"]).optional(),
        folderId: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(savedReplies)
        .set({
          name: input.name,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          shortcuts: input.shortcuts,
          scope: input.scope,
          folderId: input.folderId,
        })
        .where(eq(savedReplies.id, input.id))
        .returning();
      return updated;
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(savedReplies).where(eq(savedReplies.id, input.id));
    return { success: true };
  }),

  recordUsage: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [updated] = await db
      .update(savedReplies)
      .set({
        usageCount: sql`${savedReplies.usageCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(savedReplies.id, input.id))
      .returning();
    return updated;
  }),

  getUsageStats: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .handler(async ({ input }) => {
      const replies = await db
        .select({
          id: savedReplies.id,
          name: savedReplies.name,
          usageCount: savedReplies.usageCount,
          lastUsedAt: savedReplies.lastUsedAt,
        })
        .from(savedReplies)
        .where(eq(savedReplies.organizationId, input.organizationId))
        .orderBy(desc(savedReplies.usageCount));

      const totalUses = replies.reduce((sum, r) => sum + Number(r.usageCount), 0);

      return {
        totalUses,
        topReplies: replies.slice(0, 10),
        recentlyUsed: replies
          .filter((r) => r.lastUsedAt)
          .sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime())
          .slice(0, 10),
      };
    }),

  createFolder: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1).max(150),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [folder] = await db
        .insert(savedReplyFolders)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          createdBy: input.createdBy,
        })
        .returning();
      return folder;
    }),

  deleteFolder: publicProcedure.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db
      .update(savedReplies)
      .set({ folderId: null })
      .where(eq(savedReplies.folderId, input.id));
    await db.delete(savedReplyFolders).where(eq(savedReplyFolders.id, input.id));
    return { success: true };
  }),

  updateFolder: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(150).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(savedReplyFolders)
        .set({
          name: input.name,
          updatedAt: new Date(),
        })
        .where(eq(savedReplyFolders.id, input.id))
        .returning();
      return updated;
    }),
};
