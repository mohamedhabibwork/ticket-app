import {
  pgTable,
  bigint,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { contacts } from "./_contacts";
import { kbArticles } from "./_knowledgebase";
import { organizations } from "./_organizations";
import { tickets } from "./_tickets";

export const chatbotConfigs = pgTable("chatbot_configs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  escalationThreshold: bigint("escalation_threshold", { mode: "number" }).default(3).notNull(),
  responseDelaySeconds: bigint("response_delay_seconds", { mode: "number" }).default(5).notNull(),
  workingHours: jsonb("working_hours"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatbotSessions = pgTable(
  "chatbot_sessions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    contactId: bigint("contact_id", { mode: "number" })
      .references(() => contacts.id)
      .notNull(),
    ticketId: bigint("ticket_id", { mode: "number" }).references(() => tickets.id),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    messagesCount: bigint("messages_count", { mode: "number" }).default(0).notNull(),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    contactIdx: index("chatbot_sessions_contact_idx").on(table.contactId),
    ticketIdx: index("chatbot_sessions_ticket_idx").on(table.ticketId),
  }),
);

export const chatbotMessages = pgTable(
  "chatbot_messages",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    chatbotSessionId: bigint("chatbot_session_id", { mode: "number" })
      .references(() => chatbotSessions.id)
      .notNull(),
    authorType: varchar("author_type", { length: 20 }).notNull(),
    message: text("message").notNull(),
    intent: varchar("intent", { length: 100 }),
    confidence: bigint("confidence", { mode: "number" }),
    kbArticleId: bigint("kb_article_id", { mode: "number" }).references(() => kbArticles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index("chatbot_messages_session_idx").on(table.chatbotSessionId),
  }),
);

export const chatbotConfigsRelations = relations(chatbotConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [chatbotConfigs.organizationId],
    references: [organizations.id],
  }),
}));

export const chatbotSessionsRelations = relations(chatbotSessions, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [chatbotSessions.contactId],
    references: [contacts.id],
  }),
  ticket: one(tickets, {
    fields: [chatbotSessions.ticketId],
    references: [tickets.id],
  }),
  messages: many(chatbotMessages),
}));

export const chatbotMessagesRelations = relations(chatbotMessages, ({ one }) => ({
  session: one(chatbotSessions, {
    fields: [chatbotMessages.chatbotSessionId],
    references: [chatbotSessions.id],
  }),
  kbArticle: one(kbArticles, {
    fields: [chatbotMessages.kbArticleId],
    references: [kbArticles.id],
  }),
}));
