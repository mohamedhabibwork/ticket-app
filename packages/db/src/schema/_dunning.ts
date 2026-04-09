import { pgTable, bigint, integer, jsonb, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { subscriptions } from "./_billing";
import { invoices } from "./_invoices";

export const dunningSchedules = pgTable(
  "dunning_schedules",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    attemptNumber: integer("attempt_number").notNull(),
    delayDaysAfterFailure: integer("delay_days_after_failure").notNull(),
    sendEmail: jsonb("send_email")
      .default({ enabled: true, templateKey: "dunning_retry" })
      .notNull(),
    sendInApp: jsonb("send_in_app").default({ enabled: true }).notNull(),
    emailTemplateKey: varchar("email_template_key", { length: 150 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    attemptIdx: index("dunning_schedules_attempt_idx").on(table.attemptNumber),
  }),
);

export const dunningLogs = pgTable(
  "dunning_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    subscriptionId: bigint("subscription_id", { mode: "number" })
      .references(() => subscriptions.id)
      .notNull(),
    invoiceId: bigint("invoice_id", { mode: "number" })
      .references(() => invoices.id)
      .notNull(),
    attemptNumber: integer("attempt_number").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    result: varchar("result", { length: 30 }).notNull(),
    gatewayResponse: jsonb("gateway_response"),
    executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subscriptionIdx: index("dunning_logs_subscription_idx").on(table.subscriptionId),
    invoiceIdx: index("dunning_logs_invoice_idx").on(table.invoiceId),
    executedIdx: index("dunning_logs_executed_idx").on(table.executedAt),
  }),
);

export const subscriptionStateChanges = pgTable(
  "subscription_state_changes",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    subscriptionId: bigint("subscription_id", { mode: "number" })
      .references(() => subscriptions.id)
      .notNull(),
    fromState: varchar("from_state", { length: 30 }).notNull(),
    toState: varchar("to_state", { length: 30 }).notNull(),
    reason: varchar("reason", { length: 255 }),
    metadata: jsonb("metadata"),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subscriptionIdx: index("subscription_state_changes_subscription_idx").on(table.subscriptionId),
    changedAtIdx: index("subscription_state_changes_changed_at_idx").on(table.changedAt),
  }),
);

export const dunningSchedulesRelations = relations(dunningSchedules, () => []);

export const dunningLogsRelations = relations(dunningLogs, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [dunningLogs.subscriptionId],
    references: [subscriptions.id],
  }),
  invoice: one(invoices, {
    fields: [dunningLogs.invoiceId],
    references: [invoices.id],
  }),
}));

export const subscriptionStateChangesRelations = relations(subscriptionStateChanges, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionStateChanges.subscriptionId],
    references: [subscriptions.id],
  }),
}));
