import {
  pgTable,
  bigint,
  boolean,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./_organizations";
import { users } from "./_users";

export const kbCategories = pgTable(
  "kb_categories",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    parentId: bigint("parent_id", { mode: "number" }).references((): any => kbCategories.id),
    name: varchar("name", { length: 150 }).notNull(),
    nameAr: varchar("name_ar", { length: 150 }),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 100 }),
    orderBy: integer("order_by").default(0).notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgSlugUnique: unique().on(table.organizationId, table.slug),
    parentIdx: index("kb_categories_parent_idx").on(table.parentId),
  }),
);

export const kbArticles = pgTable(
  "kb_articles",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    categoryId: bigint("category_id", { mode: "number" }).references((): any => kbCategories.id),
    authorId: bigint("author_id", { mode: "number" }).references((): any => users.id),
    title: varchar("title", { length: 255 }).notNull(),
    titleAr: varchar("title_ar", { length: 255 }),
    slug: varchar("slug", { length: 200 }).notNull(),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text"),
    metaTitle: varchar("meta_title", { length: 255 }),
    metaDescription: text("meta_description"),
    metaKeywords: varchar("meta_keywords", { length: 500 }),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    helpfulYes: integer("helpful_yes").default(0).notNull(),
    helpfulNo: integer("helpful_no").default(0).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgSlugUnique: unique().on(table.organizationId, table.slug),
    categoryIdx: index("kb_articles_category_idx").on(table.categoryId),
  }),
);

export const kbArticleRelated = pgTable(
  "kb_article_related",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    articleId: bigint("article_id", { mode: "number" })
      .references(() => kbArticles.id)
      .notNull(),
    relatedArticleId: bigint("related_article_id", { mode: "number" })
      .references(() => kbArticles.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    articleRelatedUnique: unique().on(table.articleId, table.relatedArticleId),
  }),
);

export const kbArticleFeedback = pgTable(
  "kb_article_feedback",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    articleId: bigint("article_id", { mode: "number" })
      .references(() => kbArticles.id)
      .notNull(),
    rating: varchar("rating", { length: 10 }).notNull(),
    comment: text("comment"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    articleIdx: index("kb_article_feedback_article_idx").on(table.articleId),
  }),
);

export const kbCategoriesRelations = relations(kbCategories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [kbCategories.organizationId],
    references: [organizations.id],
  }),
  parent: one(kbCategories, {
    fields: [kbCategories.parentId],
    references: [kbCategories.id],
    relationName: "kbCategoryParent",
  }),
  children: many(kbCategories, { relationName: "kbCategoryParent" }),
  articles: many(kbArticles),
}));

export const kbArticlesRelations = relations(kbArticles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [kbArticles.organizationId],
    references: [organizations.id],
  }),
  category: one(kbCategories, {
    fields: [kbArticles.categoryId],
    references: [kbCategories.id],
  }),
  author: one(users, {
    fields: [kbArticles.authorId],
    references: [users.id],
  }),
  relatedArticles: many(kbArticleRelated, { relationName: "articleRelated" }),
  feedback: many(kbArticleFeedback),
}));

export const kbArticleRelatedRelations = relations(kbArticleRelated, ({ one }) => ({
  article: one(kbArticles, {
    fields: [kbArticleRelated.articleId],
    references: [kbArticles.id],
    relationName: "articleRelated",
  }),
  relatedArticle: one(kbArticles, {
    fields: [kbArticleRelated.relatedArticleId],
    references: [kbArticles.id],
    relationName: "articleRelated",
  }),
}));

export const kbArticleFeedbackRelations = relations(kbArticleFeedback, ({ one }) => ({
  article: one(kbArticles, {
    fields: [kbArticleFeedback.articleId],
    references: [kbArticles.id],
  }),
}));
