import {
  pgTable,
  bigint,
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const mailboxes = pgTable(
  "mailboxes",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    replyTo: varchar("reply_to", { length: 255 }),
    connectionType: varchar("connection_type", { length: 30 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    autoReplyEnabled: boolean("auto_reply_enabled").default(false).notNull(),
    autoReplySubject: varchar("auto_reply_subject", { length: 255 }),
    autoReplyBodyHtml: text("auto_reply_body_html"),
    defaultTeamId: bigint("default_team_id", { mode: "number" }).references((): any => teams.id),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncError: text("sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("mailboxes_org_idx").on(table.organizationId),
    emailIdx: index("mailboxes_email_idx").on(table.email),
    isDefaultIdx: index("mailboxes_default_idx").on(table.isDefault),
  })
);

export const mailboxImapConfigs = pgTable("mailbox_imap_configs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  mailboxId: bigint("mailbox_id", { mode: "number" })
    .references(() => mailboxes.id)
    .notNull()
    .unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  passwordEnc: text("password_enc").notNull(),
  useSsl: boolean("use_ssl").default(true).notNull(),
  oauthTokenEnc: text("oauth_token_enc"),
  oauthRefreshTokenEnc: text("oauth_refresh_token_enc"),
  oauthExpiresAt: timestamp("oauth_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mailboxSmtpConfigs = pgTable("mailbox_smtp_configs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  mailboxId: bigint("mailbox_id", { mode: "number" })
    .references(() => mailboxes.id)
    .notNull()
    .unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  passwordEnc: text("password_enc").notNull(),
  useTls: boolean("use_tls").default(true).notNull(),
  fromName: varchar("from_name", { length: 150 }),
  fromEmail: varchar("from_email", { length: 255 }),
  dkimPrivateKeyEnc: text("dkim_private_key_enc"),
  dkimSelector: varchar("dkim_selector", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mailboxAliases = pgTable(
  "mailbox_aliases",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    mailboxId: bigint("mailbox_id", { mode: "number" })
      .references(() => mailboxes.id)
      .notNull(),
    aliasEmail: varchar("alias_email", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    mailboxIdx: index("mailbox_aliases_mailbox_idx").on(table.mailboxId),
  })
);

export const emailRoutingRules = pgTable(
  "email_routing_rules",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    mailboxId: bigint("mailbox_id", { mode: "number" }).references((): any => mailboxes.id),
    name: varchar("name", { length: 150 }).notNull(),
    conditions: jsonb("conditions").notNull(),
    actionTeamId: bigint("action_team_id", { mode: "number" }).references((): any => teams.id),
    actionTagIds: bigint("action_tag_ids", { mode: "number" }).array(),
    actionPriorityId: bigint("action_priority_id", { mode: "number" }).references((): any => lookups.id),
    orderBy: integer("order_by").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("email_routing_rules_org_idx").on(table.organizationId),
  })
);

export const emailMessages = pgTable(
  "email_messages",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    mailboxId: bigint("mailbox_id", { mode: "number" })
      .references(() => mailboxes.id)
      .notNull(),
    ticketId: bigint("ticket_id", { mode: "number" }).references((): any => tickets.id),
    direction: varchar("direction", { length: 10 }).notNull(),
    messageId: text("message_id").notNull().unique(),
    inReplyTo: text("in_reply_to"),
    fromEmail: varchar("from_email", { length: 255 }).notNull(),
    fromName: varchar("from_name", { length: 255 }),
    toEmails: jsonb("to_emails").notNull(),
    ccEmails: jsonb("cc_emails"),
    bccEmails: jsonb("bcc_emails"),
    subject: text("subject"),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),
    rawHeaders: jsonb("raw_headers"),
    isSpam: boolean("is_spam").default(false).notNull(),
    spamScore: varchar("spam_score", { length: 10 }),
    bounceType: varchar("bounce_type", { length: 20 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("email_messages_org_idx").on(table.organizationId),
    mailboxIdx: index("email_messages_mailbox_idx").on(table.mailboxId),
    ticketIdx: index("email_messages_ticket_idx").on(table.ticketId),
    messageIdIdx: index("email_messages_message_id_idx").on(table.messageId),
    inReplyToIdx: index("email_messages_in_reply_to_idx").on(table.inReplyTo),
    receivedAtIdx: index("email_messages_received_at_idx").on(table.receivedAt),
  })
);

export const emailAttachments = pgTable("email_attachments", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  emailMessageId: bigint("email_message_id", { mode: "number" })
    .references(() => emailMessages.id)
    .notNull(),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 150 }).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  storageKey: text("storage_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mailboxesRelations = relations(mailboxes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [mailboxes.organizationId],
    references: [organizations.id],
  }),
  defaultTeam: one(teams, {
    fields: [mailboxes.defaultTeamId],
    references: [teams.id],
  }),
  imapConfig: one(mailboxImapConfigs, {
    fields: [mailboxes.id],
    references: [mailboxImapConfigs.mailboxId],
  }),
  smtpConfig: one(mailboxSmtpConfigs, {
    fields: [mailboxes.id],
    references: [mailboxSmtpConfigs.mailboxId],
  }),
  aliases: many(mailboxAliases),
  emailMessages: many(emailMessages),
}));

export const mailboxImapConfigsRelations = relations(mailboxImapConfigs, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [mailboxImapConfigs.mailboxId],
    references: [mailboxes.id],
  }),
}));

export const mailboxSmtpConfigsRelations = relations(mailboxSmtpConfigs, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [mailboxSmtpConfigs.mailboxId],
    references: [mailboxes.id],
  }),
}));

export const mailboxAliasesRelations = relations(mailboxAliases, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [mailboxAliases.mailboxId],
    references: [mailboxes.id],
  }),
}));

export const emailRoutingRulesRelations = relations(emailRoutingRules, ({ one }) => ({
  organization: one(organizations, {
    fields: [emailRoutingRules.organizationId],
    references: [organizations.id],
  }),
  mailbox: one(mailboxes, {
    fields: [emailRoutingRules.mailboxId],
    references: [mailboxes.id],
  }),
  actionTeam: one(teams, {
    fields: [emailRoutingRules.actionTeamId],
    references: [teams.id],
  }),
}));

export const emailMessagesRelations = relations(emailMessages, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [emailMessages.organizationId],
    references: [organizations.id],
  }),
  mailbox: one(mailboxes, {
    fields: [emailMessages.mailboxId],
    references: [mailboxes.id],
  }),
  ticket: one(tickets, {
    fields: [emailMessages.ticketId],
    references: [tickets.id],
  }),
  attachments: many(emailAttachments),
}));

export const emailAttachmentsRelations = relations(emailAttachments, ({ one }) => ({
  emailMessage: one(emailMessages, {
    fields: [emailAttachments.emailMessageId],
    references: [emailMessages.id],
  }),
}));
