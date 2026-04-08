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

export const ecommerceStores = pgTable(
  "ecommerce_stores",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" }).references((): any => users.id),
    platform: varchar("platform", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    domain: varchar("domain", { length: 255 }),
    apiKeyEnc: text("api_key_enc"),
    apiSecretEnc: text("api_secret_enc"),
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    shopDomain: varchar("shop_domain", { length: 255 }),
    region: varchar("region", { length: 50 }),
    isActive: boolean("is_active").default(true).notNull(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    syncStatus: varchar("sync_status", { length: 50 }).default("idle").notNull(),
    syncError: text("sync_error"),
    webhookSecretEnc: text("webhook_secret_enc"),
    settings: jsonb("settings").default("{}").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgPlatformUnique: unique().on(table.organizationId, table.platform, table.shopDomain),
    orgIdx: index("ecommerce_stores_org_idx").on(table.organizationId),
  })
);

export const ecommerceOrders = pgTable(
  "ecommerce_orders",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    storeId: bigint("store_id", { mode: "number" })
      .references(() => ecommerceStores.id)
      .notNull(),
    platformOrderId: varchar("platform_order_id", { length: 255 }).notNull(),
    contactId: bigint("contact_id", { mode: "number" }).references((): any => contacts.id),
    orderNumber: varchar("order_number", { length: 100 }),
    status: varchar("status", { length: 50 }).notNull(),
    financialStatus: varchar("financial_status", { length: 50 }),
    fulfillmentStatus: varchar("fulfillment_status", { length: 50 }),
    currency: varchar("currency", { length: 10 }).default("SAR").notNull(),
    subtotalAmount: varchar("subtotal_amount", { length: 50 }),
    shippingAmount: varchar("shipping_amount", { length: 50 }),
    taxAmount: varchar("tax_amount", { length: 50 }),
    totalAmount: varchar("total_amount", { length: 50 }).notNull(),
    discountAmount: varchar("discount_amount", { length: 50 }),
    discountCodes: jsonb("discount_codes").default("[]"),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 50 }),
    customerName: varchar("customer_name", { length: 255 }),
    billingAddress: jsonb("billing_address"),
    shippingAddress: jsonb("shipping_address"),
    shippingMethod: varchar("shipping_method", { length: 100 }),
    trackingNumber: varchar("tracking_number", { length: 255 }),
    trackingUrl: text("tracking_url"),
    lineItems: jsonb("line_items").default("[]"),
    platformCreatedAt: timestamp("platform_created_at", { withTimezone: true }),
    platformUpdatedAt: timestamp("platform_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    storePlatformOrderUnique: unique().on(table.storeId, table.platformOrderId),
    storeIdx: index("ecommerce_orders_store_idx").on(table.storeId),
    contactIdx: index("ecommerce_orders_contact_idx").on(table.contactId),
    customerEmailIdx: index("ecommerce_orders_customer_email_idx").on(table.customerEmail),
    orderNumberIdx: index("ecommerce_orders_order_number_idx").on(table.orderNumber),
  })
);

export const ecommerceStoresRelations = relations(ecommerceStores, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [ecommerceStores.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [ecommerceStores.userId],
    references: [users.id],
  }),
  orders: many(ecommerceOrders),
}));

export const ecommerceOrdersRelations = relations(ecommerceOrders, ({ one }) => ({
  store: one(ecommerceStores, {
    fields: [ecommerceOrders.storeId],
    references: [ecommerceStores.id],
  }),
  contact: one(contacts, {
    fields: [ecommerceOrders.contactId],
    references: [contacts.id],
  }),
}));
