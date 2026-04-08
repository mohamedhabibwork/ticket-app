import {
  pgTable,
  bigint,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const savedReplyFolders = pgTable(
  "saved_reply_folders",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("saved_reply_folders_org_idx").on(table.organizationId),
  })
);

export const savedReplies = pgTable(
  "saved_replies",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    folderId: bigint("folder_id", { mode: "number" }).references((): any => savedReplyFolders.id),
    userId: bigint("user_id", { mode: "number" }).references((): any => users.id),
    name: varchar("name", { length: 150 }).notNull(),
    subject: varchar("subject", { length: 255 }),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text"),
    shortcuts: varchar("shortcuts", { length: 100 }),
    scope: varchar("scope", { length: 20 }).default("personal").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("saved_replies_org_idx").on(table.organizationId),
  })
);

export const savedReplyFoldersRelations = relations(savedReplyFolders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [savedReplyFolders.organizationId],
    references: [organizations.id],
  }),
  replies: many(savedReplies),
}));

export const savedRepliesRelations = relations(savedReplies, ({ one }) => ({
  organization: one(organizations, {
    fields: [savedReplies.organizationId],
    references: [organizations.id],
  }),
  folder: one(savedReplyFolders, {
    fields: [savedReplies.folderId],
    references: [savedReplyFolders.id],
  }),
  user: one(users, {
    fields: [savedReplies.userId],
    references: [users.id],
  }),
}));
