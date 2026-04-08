import {
  pgTable,
  bigint,
  boolean,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const socialAccounts = pgTable(
  "social_accounts",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" }).references((): any => users.id),
    platform: varchar("platform", { length: 50 }).notNull(),
    platformAccountId: varchar("platform_account_id", { length: 255 }).notNull(),
    platformUsername: varchar("platform_username", { length: 150 }),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgPlatformUnique: unique().on(table.organizationId, table.platform, table.platformAccountId),
  })
);

export const socialMessages = pgTable(
  "social_messages",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    socialAccountId: bigint("social_account_id", { mode: "number" })
      .references(() => socialAccounts.id)
      .notNull(),
    ticketId: bigint("ticket_id", { mode: "number" }).references((): any => tickets.id),
    platform: varchar("platform", { length: 50 }).notNull(),
    platformMessageId: varchar("platform_message_id", { length: 255 }).notNull(),
    platformParentMessageId: varchar("platform_parent_message_id", { length: 255 }),
    authorPlatformUserId: varchar("author_platform_user_id", { length: 255 }),
    authorUsername: varchar("author_username", { length: 150 }),
    authorName: varchar("author_name", { length: 150 }),
    authorAvatarUrl: text("author_avatar_url"),
    messageType: varchar("message_type", { length: 20 }).notNull(),
    bodyText: text("body_text").notNull(),
    bodyHtml: text("body_html"),
    mediaUrls: jsonb("media_urls"),
    linkUrls: jsonb("link_urls"),
    isIncoming: boolean("is_incoming").default(true).notNull(),
    isSpam: boolean("is_spam").default(false).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    accountPlatformMsgUnique: unique().on(table.socialAccountId, table.platformMessageId),
    ticketIdx: index("social_messages_ticket_idx").on(table.ticketId),
  })
);

export const socialAccountsRelations = relations(socialAccounts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [socialAccounts.organizationId],
    references: [organizations.id],
  }),
  messages: many(socialMessages),
}));

export const socialMessagesRelations = relations(socialMessages, ({ one }) => ({
  socialAccount: one(socialAccounts, {
    fields: [socialMessages.socialAccountId],
    references: [socialAccounts.id],
  }),
  ticket: one(tickets, {
    fields: [socialMessages.ticketId],
    references: [tickets.id],
  }),
}));
