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
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    slug: varchar("slug", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    priceMonthly: bigint("price_monthly", { mode: "number" }).notNull(),
    priceYearly: bigint("price_yearly", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    trialDays: integer("trial_days").default(0).notNull(),
    maxAgents: integer("max_agents").notNull(),
    maxContacts: integer("max_contacts").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const planFeatures = pgTable(
  "plan_features",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    planId: bigint("plan_id", { mode: "number" })
      .references(() => subscriptionPlans.id)
      .notNull(),
    feature: varchar("feature", { length: 100 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    limit: integer("limit"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    planFeatureUnique: unique().on(table.planId, table.feature),
    planIdx: index("plan_features_plan_idx").on(table.planId),
  })
);

export const planLimits = pgTable(
  "plan_limits",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    planId: bigint("plan_id", { mode: "number" })
      .references(() => subscriptionPlans.id)
      .notNull(),
    limitType: varchar("limit_type", { length: 50 }).notNull(),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    planLimitUnique: unique().on(table.planId, table.limitType),
  })
);

export const addons = pgTable(
  "addons",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    slug: varchar("slug", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    priceMonthly: bigint("price_monthly", { mode: "number" }).notNull(),
    priceYearly: bigint("price_yearly", { mode: "number" }).notNull(),
    pricePerUnit: bigint("price_per_unit", { mode: "number" }),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    unitLabel: varchar("unit_label", { length: 50 }),
    isActive: boolean("is_active").default(true).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    planId: bigint("plan_id", { mode: "number" })
      .references(() => subscriptionPlans.id)
      .notNull(),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    status: varchar("status", { length: 30 }).default("active").notNull(),
    billingCycle: varchar("billing_cycle", { length: 10 }).notNull(),
    seatCount: integer("seat_count").default(1).notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    trialStart: timestamp("trial_start", { withTimezone: true }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUnique: unique().on(table.organizationId),
    stripeSubIdx: index("subscriptions_stripe_idx").on(table.stripeSubscriptionId),
    orgIdx: index("subscriptions_org_idx").on(table.organizationId),
  })
);

export const seats = pgTable(
  "seats",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    subscriptionId: bigint("subscription_id", { mode: "number" })
      .references(() => subscriptions.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    role: varchar("role", { length: 50 }).default("agent").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    subscriptionUserUnique: unique().on(table.subscriptionId, table.userId),
    subscriptionIdx: index("seats_subscription_idx").on(table.subscriptionId),
    userIdx: index("seats_user_idx").on(table.userId),
  })
);

export const usageSnapshots = pgTable(
  "usage_snapshots",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    snapshotDate: timestamp("snapshot_date", { withTimezone: true }).defaultNow().notNull(),
    agentCount: integer("agent_count").default(0).notNull(),
    contactCount: integer("contact_count").default(0).notNull(),
    ticketCount: integer("ticket_count").default(0).notNull(),
    storageUsedMb: integer("storage_used_mb").default(0).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgSnapshotIdx: index("usage_snapshots_org_idx").on(table.organizationId, table.snapshotDate),
  })
);

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  planFeatures: many(planFeatures),
  planLimits: many(planLimits),
  subscriptions: many(subscriptions),
}));

export const planFeaturesRelations = relations(planFeatures, ({ one }) => ({
  plan: one(subscriptionPlans, {
    fields: [planFeatures.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const planLimitsRelations = relations(planLimits, ({ one }) => ({
  plan: one(subscriptionPlans, {
    fields: [planLimits.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  seats: many(seats),
}));

export const seatsRelations = relations(seats, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [seats.subscriptionId],
    references: [subscriptions.id],
  }),
  user: one(users, {
    fields: [seats.userId],
    references: [users.id],
  }),
}));
