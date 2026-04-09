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
import { contacts } from "./_contacts";
import { organizations } from "./_organizations";
import { tickets } from "./_tickets";
import { users } from "./_users";

export const chatWidgets = pgTable(
  "chat_widgets",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    position: varchar("position", { length: 20 }).default("bottom-right").notNull(),
    theme: jsonb("theme").default({}).notNull(),
    preChatFormFields: jsonb("pre_chat_form_fields").default([]).notNull(),
    offlineMessageEnabled: boolean("offline_message_enabled").default(true).notNull(),
    offlineMessageTitle: varchar("offline_message_title", { length: 255 }),
    offlineMessageBody: text("offline_message_body"),
    businessHours: jsonb("business_hours").default({
      enabled: false,
      timezone: "UTC",
      schedule: {},
    }).notNull(),
    allowFileUpload: boolean("allow_file_upload").default(true).notNull(),
    maxFileSizeBytes: integer("max_file_size_bytes").default(10485760).notNull(),
    allowedFileTypes: jsonb("allowed_file_types").default([
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
    ]).notNull(),
    autoTicketConversion: boolean("auto_ticket_conversion").default(true).notNull(),
    greetingMessage: text("greeting_message"),
    agentUnavailableMessage: text("agent_unavailable_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("chat_widgets_org_idx").on(table.organizationId),
  })
);

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    widgetId: bigint("widget_id", { mode: "number" })
      .references(() => chatWidgets.id)
      .notNull(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    contactId: bigint("contact_id", { mode: "number" }).references((): any => contacts.id),
    ticketId: bigint("ticket_id", { mode: "number" }).references((): any => tickets.id),
    agentId: bigint("agent_id", { mode: "number" }).references((): any => users.id),
    status: varchar("status", { length: 20 }).default("waiting").notNull(),
    preChatData: jsonb("pre_chat_data").default({}).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endedBy: varchar("ended_by", { length: 20 }),
    rating: integer("rating"),
    ratingComment: text("rating_comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    widgetIdx: index("chat_sessions_widget_idx").on(table.widgetId),
    orgIdx: index("chat_sessions_org_idx").on(table.organizationId),
    contactIdx: index("chat_sessions_contact_idx").on(table.contactId),
    statusIdx: index("chat_sessions_status_idx").on(table.status),
  })
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    sessionId: bigint("session_id", { mode: "number" })
      .references(() => chatSessions.id)
      .notNull(),
    authorType: varchar("author_type", { length: 20 }).notNull(),
    authorUserId: bigint("author_user_id", { mode: "number" }).references((): any => users.id),
    authorContactId: bigint("author_contact_id", { mode: "number" }).references((): any => contacts.id),
    messageType: varchar("message_type", { length: 20 }).default("text").notNull(),
    body: text("body"),
    attachments: jsonb("attachments").default([]).notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index("chat_messages_session_idx").on(table.sessionId),
    createdAtIdx: index("chat_messages_created_at_idx").on(table.createdAt),
  })
);

export const chatWidgetsRelations = relations(chatWidgets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [chatWidgets.organizationId],
    references: [organizations.id],
  }),
  sessions: many(chatSessions),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  widget: one(chatWidgets, {
    fields: [chatSessions.widgetId],
    references: [chatWidgets.id],
  }),
  organization: one(organizations, {
    fields: [chatSessions.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [chatSessions.contactId],
    references: [contacts.id],
  }),
  ticket: one(tickets, {
    fields: [chatSessions.ticketId],
    references: [tickets.id],
  }),
  agent: one(users, {
    fields: [chatSessions.agentId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  authorUser: one(users, {
    fields: [chatMessages.authorUserId],
    references: [users.id],
  }),
  authorContact: one(contacts, {
    fields: [chatMessages.authorContactId],
    references: [contacts.id],
  }),
}));
