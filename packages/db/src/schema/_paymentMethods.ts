import {
  pgTable,
  bigint,
  boolean,
  integer,
  jsonb,
  timestamp,
  uuid,
  varchar,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { subscriptions } from "./_billing";
import { organizations } from "./_organizations";

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    gateway: varchar("gateway", { length: 20 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    last4: varchar("last4", { length: 4 }),
    brand: varchar("brand", { length: 50 }),
    expiryMonth: integer("expiry_month"),
    expiryYear: integer("expiry_year"),
    gatewayToken: varchar("gateway_token", { length: 255 }),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgGatewayUnique: unique().on(table.organizationId, table.gateway, table.gatewayToken),
    orgIdx: index("payment_methods_org_idx").on(table.organizationId),
  }),
);

export const coupons = pgTable("coupons", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull(),
  value: integer("value").notNull(),
  currency: varchar("currency", { length: 3 }),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").default(0).notNull(),
  minSubscriptionValue: bigint("min_subscription_value", { mode: "number" }),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    couponId: bigint("coupon_id", { mode: "number" })
      .references(() => coupons.id)
      .notNull(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    subscriptionId: bigint("subscription_id", { mode: "number" }).references(
      () => subscriptions.id,
    ),
    discount: bigint("discount", { mode: "number" }).notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    couponOrgUnique: unique().on(table.couponId, table.organizationId),
    couponIdx: index("coupon_redemptions_coupon_idx").on(table.couponId),
    orgIdx: index("coupon_redemptions_org_idx").on(table.organizationId),
  }),
);

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentMethods.organizationId],
    references: [organizations.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  redemptions: many(couponRedemptions),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
  organization: one(organizations, {
    fields: [couponRedemptions.organizationId],
    references: [organizations.id],
  }),
  subscription: one(subscriptions, {
    fields: [couponRedemptions.subscriptionId],
    references: [subscriptions.id],
  }),
}));
