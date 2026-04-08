import { db } from "@ticket-app/db";
import { kbArticles, kbArticleFeedback, kbArticleRelated } from "@ticket-app/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import z from "zod";

import { publicProcedure } from "../index";
import { searchKbArticles } from "../services/kbSearch";

export const kbArticlesRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        categoryId: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(kbArticles.organizationId, input.organizationId),
        isNull(kbArticles.deletedAt),
      ];

      if (input.categoryId) {
        conditions.push(eq(kbArticles.categoryId, input.categoryId));
      }

      if (input.status) {
        conditions.push(eq(kbArticles.status, input.status));
      }

      return await db.query.kbArticles.findMany({
        where: and(...conditions),
        orderBy: [desc(kbArticles.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          category: true,
          author: true,
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
      const article = await db.query.kbArticles.findFirst({
        where: and(
          eq(kbArticles.id, input.id),
          eq(kbArticles.organizationId, input.organizationId),
          isNull(kbArticles.deletedAt)
        ),
        with: {
          category: true,
          author: true,
        },
      });

      if (article) {
        await db
          .update(kbArticles)
          .set({ viewCount: sql`${kbArticles.viewCount} + 1` })
          .where(eq(kbArticles.id, article.id));
      }

      return article;
    }),

  getBySlug: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        slug: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const article = await db.query.kbArticles.findFirst({
        where: and(
          eq(kbArticles.slug, input.slug),
          eq(kbArticles.organizationId, input.organizationId),
          eq(kbArticles.status, "published"),
          isNull(kbArticles.deletedAt)
        ),
        with: {
          category: true,
          author: true,
          relatedArticles: {
            with: {
              relatedArticle: true,
            },
          },
        },
      });

      if (article) {
        await db
          .update(kbArticles)
          .set({ viewCount: sql`${kbArticles.viewCount} + 1` })
          .where(eq(kbArticles.id, article.id));
      }

      return article;
    }),

  getRelated: publicProcedure
    .input(
      z.object({
        articleId: z.number(),
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .handler(async ({ input }) => {
      const related = await db.query.kbArticleRelated.findMany({
        where: eq(kbArticleRelated.articleId, input.articleId),
        limit: input.limit,
        with: {
          relatedArticle: {
            with: {
              category: true,
            },
          },
        },
      });

      return related.map((r) => r.relatedArticle);
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        categoryId: z.number().optional(),
        authorId: z.number().optional(),
        title: z.string().min(1).max(255),
        titleAr: z.string().max(255).optional(),
        slug: z.string().min(1).max(200),
        bodyHtml: z.string().min(1),
        bodyText: z.string().optional(),
        metaTitle: z.string().max(255).optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.string().max(500).optional(),
        status: z.string().default("draft"),
        createdBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [article] = await db
        .insert(kbArticles)
        .values({
          organizationId: input.organizationId,
          categoryId: input.categoryId,
          authorId: input.authorId,
          title: input.title,
          titleAr: input.titleAr,
          slug: input.slug,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          metaKeywords: input.metaKeywords,
          status: input.status,
          createdBy: input.createdBy,
          publishedAt: input.status === "published" ? new Date() : null,
        })
        .returning();

      return article;
    }),

  update: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
        categoryId: z.number().nullable().optional(),
        title: z.string().min(1).max(255).optional(),
        titleAr: z.string().max(255).optional(),
        slug: z.string().min(1).max(200).optional(),
        bodyHtml: z.string().min(1).optional(),
        bodyText: z.string().optional(),
        metaTitle: z.string().max(255).optional(),
        metaDescription: z.string().optional(),
        metaKeywords: z.string().max(500).optional(),
        status: z.string().optional(),
        updatedBy: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const { organizationId, id, ...updates } = input;

      const existing = await db.query.kbArticles.findFirst({
        where: and(
          eq(kbArticles.id, id),
          eq(kbArticles.organizationId, organizationId),
          isNull(kbArticles.deletedAt)
        ),
      });

      const [article] = await db
        .update(kbArticles)
        .set({
          ...updates,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
          publishedAt:
            updates.status === "published" && existing?.status !== "published"
              ? new Date()
              : existing?.publishedAt,
        })
        .where(
          and(
            eq(kbArticles.id, id),
            eq(kbArticles.organizationId, organizationId),
            isNull(kbArticles.deletedAt)
          )
        )
        .returning();

      return article;
    }),

  delete: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
        deletedBy: z.number(),
      })
    )
    .handler(async ({ input }) => {
      await db
        .update(kbArticles)
        .set({
          deletedAt: new Date(),
          deletedBy: input.deletedBy,
        })
        .where(
          and(
            eq(kbArticles.id, input.id),
            eq(kbArticles.organizationId, input.organizationId),
            isNull(kbArticles.deletedAt)
          )
        );

      return { success: true };
    }),

  submitFeedback: publicProcedure
    .input(
      z.object({
        articleId: z.number(),
        rating: z.enum(["helpful", "not_helpful"]),
        comment: z.string().optional(),
        ipAddress: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [feedback] = await db
        .insert(kbArticleFeedback)
        .values({
          articleId: input.articleId,
          rating: input.rating,
          comment: input.comment,
          ipAddress: input.ipAddress,
        })
        .returning();

      if (input.rating === "helpful") {
        await db
          .update(kbArticles)
          .set({ helpfulYes: sql`${kbArticles.helpfulYes} + 1` })
          .where(eq(kbArticles.id, input.articleId));
      } else {
        await db
          .update(kbArticles)
          .set({ helpfulNo: sql`${kbArticles.helpfulNo} + 1` })
          .where(eq(kbArticles.id, input.articleId));
      }

      return feedback;
    }),

  search: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        query: z.string().min(1),
        locale: z.string().default("en"),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .handler(async ({ input }) => {
      return await searchKbArticles({
        organizationId: input.organizationId,
        query: input.query,
        locale: input.locale,
        limit: input.limit,
      });
    }),
};