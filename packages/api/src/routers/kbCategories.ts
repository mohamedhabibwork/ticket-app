import { db } from "@ticket-app/db";
import { kbCategories, kbArticles } from "@ticket-app/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import * as z from "zod";

import { publicProcedure } from "../index";

export const kbCategoriesRouter = {
  list: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        parentId: z.number().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [
        eq(kbCategories.organizationId, input.organizationId),
        isNull(kbCategories.deletedAt),
      ];

      if (input.parentId !== undefined) {
        conditions.push(
          input.parentId === null
            ? isNull(kbCategories.parentId)
            : eq(kbCategories.parentId, input.parentId),
        );
      }

      if (input.isPublished !== undefined) {
        conditions.push(eq(kbCategories.isPublished, input.isPublished));
      }

      return await db.query.kbCategories.findMany({
        where: and(...conditions),
        orderBy: [asc(kbCategories.orderBy), asc(kbCategories.name)],
        with: {
          articles: {
            where: eq(kbArticles.status, "published"),
          },
        },
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
      return await db.query.kbCategories.findFirst({
        where: and(
          eq(kbCategories.id, input.id),
          eq(kbCategories.organizationId, input.organizationId),
          isNull(kbCategories.deletedAt),
        ),
        with: {
          children: {
            where: eq(kbCategories.isPublished, true),
            orderBy: [asc(kbCategories.orderBy)],
          },
          articles: true,
        },
      });
    }),

  getBySlug: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        slug: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      return await db.query.kbCategories.findFirst({
        where: and(
          eq(kbCategories.slug, input.slug),
          eq(kbCategories.organizationId, input.organizationId),
          eq(kbCategories.isPublished, true),
          isNull(kbCategories.deletedAt),
        ),
        with: {
          children: {
            where: eq(kbCategories.isPublished, true),
            orderBy: [asc(kbCategories.orderBy)],
          },
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        parentId: z.number().optional(),
        name: z.string().min(1).max(150),
        nameAr: z.string().max(150).optional(),
        slug: z.string().min(1).max(200),
        description: z.string().optional(),
        icon: z.string().max(100).optional(),
        orderBy: z.number().default(0),
        isPublished: z.boolean().default(false),
        createdBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [category] = await db
        .insert(kbCategories)
        .values({
          organizationId: input.organizationId,
          parentId: input.parentId,
          name: input.name,
          nameAr: input.nameAr,
          slug: input.slug,
          description: input.description,
          icon: input.icon,
          orderBy: input.orderBy,
          isPublished: input.isPublished,
          createdBy: input.createdBy,
        })
        .returning();

      return category;
    }),

  update: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
        parentId: z.number().nullable().optional(),
        name: z.string().min(1).max(150).optional(),
        nameAr: z.string().max(150).optional(),
        slug: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        icon: z.string().max(100).optional(),
        orderBy: z.number().optional(),
        isPublished: z.boolean().optional(),
        updatedBy: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { organizationId, id, ...updates } = input;

      const [category] = await db
        .update(kbCategories)
        .set({
          ...updates,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        })
        .where(
          and(
            eq(kbCategories.id, id),
            eq(kbCategories.organizationId, organizationId),
            isNull(kbCategories.deletedAt),
          ),
        )
        .returning();

      return category;
    }),

  delete: publicProcedure
    .input(
      z.object({
        organizationId: z.number(),
        id: z.number(),
        deletedBy: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(kbCategories)
        .set({
          deletedAt: new Date(),
          deletedBy: input.deletedBy,
        })
        .where(
          and(
            eq(kbCategories.id, input.id),
            eq(kbCategories.organizationId, input.organizationId),
            isNull(kbCategories.deletedAt),
          ),
        );

      return { success: true };
    }),
};
