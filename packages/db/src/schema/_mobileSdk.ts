import { pgTable, bigint, varchar, boolean, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { contacts } from "./_contacts";
import { organizations } from "./_organizations";
import { tickets } from "./_tickets";

export const mobileSdkConfigs = pgTable("mobile_sdk_configs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  platform: varchar("platform", { length: 20 }).notNull(),
  appBundleId: varchar("app_bundle_id", { length: 255 }).notNull(),
  fcmServerKey: text("fcm_server_key"),
  apnsKeyId: varchar("apns_key_id", { length: 50 }),
  apnsTeamId: varchar("apns_team_id", { length: 50 }),
  apnsKey: text("apns_key"),
  apnsBundleId: varchar("apns_bundle_id", { length: 255 }),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contactPushTokens = pgTable("contact_push_tokens", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  contactId: bigint("contact_id", { mode: "number" })
    .references(() => contacts.id)
    .notNull(),
  platform: varchar("platform", { length: 20 }).notNull(),
  token: text("token").notNull(),
  deviceId: varchar("device_id", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pushNotificationLogs = pgTable("push_notification_logs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  contactId: bigint("contact_id", { mode: "number" })
    .references(() => contacts.id)
    .notNull(),
  pushTokenId: bigint("push_token_id", { mode: "number" }).references(() => contactPushTokens.id),
  ticketId: bigint("ticket_id", { mode: "number" }).references(() => tickets.id),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  data: jsonb("data"),
  status: varchar("status", { length: 20 }).notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mobileSdkConfigsRelations = relations(mobileSdkConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [mobileSdkConfigs.organizationId],
    references: [organizations.id],
  }),
}));

export const contactPushTokensRelations = relations(contactPushTokens, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [contactPushTokens.contactId],
    references: [contacts.id],
  }),
  logs: many(pushNotificationLogs),
}));

export const pushNotificationLogsRelations = relations(pushNotificationLogs, ({ one }) => ({
  contact: one(contacts, {
    fields: [pushNotificationLogs.contactId],
    references: [contacts.id],
  }),
  pushToken: one(contactPushTokens, {
    fields: [pushNotificationLogs.pushTokenId],
    references: [contactPushTokens.id],
  }),
  ticket: one(tickets, {
    fields: [pushNotificationLogs.ticketId],
    references: [tickets.id],
  }),
}));
