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
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { lookups } from "./_lookups";
import { organizations } from "./_organizations";
import { contacts } from "./_contacts";
import { teams, users } from "./_users";
import { emailMessages, mailboxes } from "./_mailboxes";
import { formSubmissions } from "./_forms";
import { socialMessages } from "./_social";
import { chatSessions } from "./_chat";
import { ticketCustomFields, ticketSla } from "./_sla";

export const tickets = pgTable(
  "tickets",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    referenceNumber: varchar("reference_number", { length: 30 }).notNull().unique(),
    subject: text("subject").notNull(),
    descriptionHtml: text("description_html"),
    statusId: bigint("status_id", { mode: "number" })
      .references(() => lookups.id)
      .notNull(),
    priorityId: bigint("priority_id", { mode: "number" })
      .references(() => lookups.id)
      .notNull(),
    channelId: bigint("channel_id", { mode: "number" }).references((): any => lookups.id),
    contactId: bigint("contact_id", { mode: "number" }).references((): any => contacts.id),
    assignedAgentId: bigint("assigned_agent_id", { mode: "number" }).references((): any => users.id),
    assignedTeamId: bigint("assigned_team_id", { mode: "number" }).references((): any => teams.id),
    mailboxId: bigint("mailbox_id", { mode: "number" }).references((): any => mailboxes.id),
    formSubmissionId: bigint("form_submission_id", { mode: "number" }).references((): any => formSubmissions.id),
    socialMessageId: bigint("social_message_id", { mode: "number" }).references((): any => socialMessages.id),
    chatSessionId: bigint("chat_session_id", { mode: "number" }).references((): any => chatSessions.id),
    parentTicketId: bigint("parent_ticket_id", { mode: "number" }).references((): any => tickets.id),
    isMerged: boolean("is_merged").default(false).notNull(),
    isSpam: boolean("is_spam").default(false).notNull(),
    isLocked: boolean("is_locked").default(false).notNull(),
    lockedBy: bigint("locked_by", { mode: "number" }).references((): any => users.id),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgStatusIdx: index("tickets_org_status_idx").on(table.organizationId, table.statusId),
    assignedAgentIdx: index("tickets_assigned_agent_idx").on(table.assignedAgentId),
    assignedTeamIdx: index("tickets_assigned_team_idx").on(table.assignedTeamId),
    contactIdx: index("tickets_contact_idx").on(table.contactId),
    createdAtIdx: index("tickets_created_at_idx").on(table.createdAt),
  })
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    emailMessageId: bigint("email_message_id", { mode: "number" }).references((): any => emailMessages.id),
    authorType: varchar("author_type", { length: 20 }).notNull(),
    authorUserId: bigint("author_user_id", { mode: "number" }).references((): any => users.id),
    authorContactId: bigint("author_contact_id", { mode: "number" }).references((): any => contacts.id),
    messageType: varchar("message_type", { length: 20 }).notNull(),
    bodyHtml: text("body_html"),
    bodyText: text("body_text"),
    isPrivate: boolean("is_private").default(false).notNull(),
    isLocked: boolean("is_locked").default(false).notNull(),
    lockedBy: bigint("locked_by", { mode: "number" }).references((): any => users.id),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    deletedReason: text("deleted_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    ticketIdx: index("ticket_messages_ticket_idx").on(table.ticketId),
  })
);

export const ticketAttachments = pgTable("ticket_attachments", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  ticketId: bigint("ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull(),
  ticketMessageId: bigint("ticket_message_id", { mode: "number" }).references((): any => ticketMessages.id),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 150 }).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  storageKey: text("storage_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
});

export const tags = pgTable(
  "tags",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgNameUnique: unique().on(table.organizationId, table.name),
  })
);

export const ticketTags = pgTable(
  "ticket_tags",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    tagId: bigint("tag_id", { mode: "number" })
      .references(() => tags.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    ticketTagUnique: unique().on(table.ticketId, table.tagId),
  })
);

export const ticketFollowers = pgTable(
  "ticket_followers",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketFollowerUnique: unique().on(table.ticketId, table.userId),
  })
);

export const ticketCc = pgTable(
  "ticket_cc",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketEmailUnique: unique().on(table.ticketId, table.email),
  })
);

export const ticketMerges = pgTable("ticket_merges", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  masterTicketId: bigint("master_ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull(),
  mergedTicketId: bigint("merged_ticket_id", { mode: "number" })
    .references(() => tickets.id)
    .notNull(),
  mergedAt: timestamp("merged_at", { withTimezone: true }).defaultNow().notNull(),
  mergedBy: bigint("merged_by", { mode: "number" })
    .references(() => users.id)
    .notNull(),
});

export const ticketCustomFieldValues = pgTable(
  "ticket_custom_field_values",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull(),
    fieldId: bigint("field_id", { mode: "number" })
      .references(() => ticketCustomFields.id)
      .notNull(),
    valueText: text("value_text"),
    valueNumber: varchar("value_number", { length: 100 }),
    valueBoolean: boolean("value_boolean"),
    valueDate: timestamp("value_date", { withTimezone: true }),
    valueLookupId: bigint("value_lookup_id", { mode: "number" }).references((): any => lookups.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    ticketFieldUnique: unique().on(table.ticketId, table.fieldId),
  })
);

export const ticketViews = pgTable(
  "ticket_views",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" }).references((): any => users.id),
    name: varchar("name", { length: 150 }).notNull(),
    filters: jsonb("filters").notNull(),
    sortBy: varchar("sort_by", { length: 50 }).default("created_at").notNull(),
    sortDir: varchar("sort_dir", { length: 4 }).default("desc").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("ticket_views_org_idx").on(table.organizationId),
  })
);

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tickets.organizationId],
    references: [organizations.id],
  }),
  status: one(lookups, {
    fields: [tickets.statusId],
    references: [lookups.id],
    relationName: "ticketStatus",
  }),
  priority: one(lookups, {
    fields: [tickets.priorityId],
    references: [lookups.id],
    relationName: "ticketPriority",
  }),
  channel: one(lookups, {
    fields: [tickets.channelId],
    references: [lookups.id],
    relationName: "ticketChannel",
  }),
  contact: one(contacts, {
    fields: [tickets.contactId],
    references: [contacts.id],
  }),
  assignedAgent: one(users, {
    fields: [tickets.assignedAgentId],
    references: [users.id],
    relationName: "assignedAgent",
  }),
  assignedTeam: one(teams, {
    fields: [tickets.assignedTeamId],
    references: [teams.id],
  }),
  mailbox: one(mailboxes, {
    fields: [tickets.mailboxId],
    references: [mailboxes.id],
  }),
  parentTicket: one(tickets, {
    fields: [tickets.parentTicketId],
    references: [tickets.id],
    relationName: "ticketMerge",
  }),
  mergedTickets: many(ticketMerges, { relationName: "mergedTickets" }),
  messages: many(ticketMessages),
  attachments: many(ticketAttachments),
  tags: many(ticketTags),
  followers: many(ticketFollowers),
  customFieldValues: many(ticketCustomFieldValues),
  sla: one(ticketSla, {
    fields: [tickets.id],
    references: [ticketSla.ticketId],
  }),
  views: many(ticketViews),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one, many }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id],
  }),
  authorUser: one(users, {
    fields: [ticketMessages.authorUserId],
    references: [users.id],
    relationName: "messageAuthor",
  }),
  authorContact: one(contacts, {
    fields: [ticketMessages.authorContactId],
    references: [contacts.id],
    relationName: "messageContact",
  }),
  attachments: many(ticketAttachments),
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketAttachments.ticketId],
    references: [tickets.id],
  }),
  message: one(ticketMessages, {
    fields: [ticketAttachments.ticketMessageId],
    references: [ticketMessages.id],
  }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tags.organizationId],
    references: [organizations.id],
  }),
  ticketTags: many(ticketTags),
}));

export const ticketTagsRelations = relations(ticketTags, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketTags.ticketId],
    references: [tickets.id],
  }),
  tag: one(tags, {
    fields: [ticketTags.tagId],
    references: [tags.id],
  }),
}));

export const ticketFollowersRelations = relations(ticketFollowers, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketFollowers.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketFollowers.userId],
    references: [users.id],
  }),
}));

export const ticketMergesRelations = relations(ticketMerges, ({ one }) => ({
  masterTicket: one(tickets, {
    fields: [ticketMerges.masterTicketId],
    references: [tickets.id],
    relationName: "masterTicket",
  }),
  mergedTicket: one(tickets, {
    fields: [ticketMerges.mergedTicketId],
    references: [tickets.id],
    relationName: "mergedTicket",
  }),
}));

export const ticketCustomFieldValuesRelations = relations(ticketCustomFieldValues, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketCustomFieldValues.ticketId],
    references: [tickets.id],
  }),
  field: one(ticketCustomFields, {
    fields: [ticketCustomFieldValues.fieldId],
    references: [ticketCustomFields.id],
  }),
}));

export const ticketViewsRelations = relations(ticketViews, ({ one }) => ({
  organization: one(organizations, {
    fields: [ticketViews.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [ticketViews.userId],
    references: [users.id],
  }),
}));
