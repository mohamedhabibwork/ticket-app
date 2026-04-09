import {
  pgTable,
  bigint,
  integer,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { subscriptions, subscriptionPlans } from "./_billing";
import { organizations } from "./_organizations";

export const revenueSnapshots = pgTable(
  "revenue_snapshots",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    subscriptionId: bigint("subscription_id", { mode: "number" })
      .references(() => subscriptions.id)
      .notNull(),
    planId: bigint("plan_id", { mode: "number" })
      .references(() => subscriptionPlans.id)
      .notNull(),
    mrr: bigint("mrr", { mode: "number" }).notNull(),
    arr: bigint("arr", { mode: "number" }).notNull(),
    seatCount: integer("seat_count").default(1).notNull(),
    snapshotDate: timestamp("snapshot_date", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgSnapshotIdx: index("revenue_snapshots_org_idx").on(table.organizationId, table.snapshotDate),
    subscriptionIdx: index("revenue_snapshots_subscription_idx").on(table.subscriptionId),
  })
);

export const mrrHistory = pgTable(
  "mrr_history",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    subscriptionId: bigint("subscription_id", { mode: "number" })
      .references(() => subscriptions.id),
    planId: bigint("plan_id", { mode: "number" })
      .references(() => subscriptionPlans.id),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    changeType: varchar("change_type", { length: 30 }).notNull(),
    changeReason: varchar("change_reason", { length: 100 }),
    effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgMrrIdx: index("mrr_history_org_idx").on(table.organizationId, table.effectiveDate),
  })
);

export const revenueSnapshotsRelations = relations(revenueSnapshots, ({ one }) => ({
  organization: one(organizations, {
    fields: [revenueSnapshots.organizationId],
    references: [organizations.id],
  }),
  subscription: one(subscriptions, {
    fields: [revenueSnapshots.subscriptionId],
    references: [subscriptions.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [revenueSnapshots.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const mrrHistoryRelations = relations(mrrHistory, ({ one }) => ({
  organization: one(organizations, {
    fields: [mrrHistory.organizationId],
    references: [organizations.id],
  }),
  subscription: one(subscriptions, {
    fields: [mrrHistory.subscriptionId],
    references: [subscriptions.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [mrrHistory.planId],
    references: [subscriptionPlans.id],
  }),
}));
