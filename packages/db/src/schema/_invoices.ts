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

export const invoices = pgTable(
  "invoices",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    subscriptionId: bigint("subscription_id", { mode: "number" })
      .references(() => subscriptions.id),
    number: varchar("number", { length: 50 }).notNull().unique(),
    status: varchar("status", { length: 30 }).default("draft").notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    subtotal: bigint("subtotal", { mode: "number" }).notNull(),
    taxAmount: bigint("tax_amount", { mode: "number" }).default(0).notNull(),
    taxRate: integer("tax_rate").default(0).notNull(),
    total: bigint("total", { mode: "number" }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    pdfUrl: text("pdf_url"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("invoices_org_idx").on(table.organizationId),
    orgNumberUnique: unique().on(table.organizationId, table.number),
    subscriptionIdx: index("invoices_subscription_idx").on(table.subscriptionId),
    statusIdx: index("invoices_status_idx").on(table.status),
  })
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    invoiceId: bigint("invoice_id", { mode: "number" })
      .references(() => invoices.id)
      .notNull(),
    description: text("description").notNull(),
    quantity: integer("quantity").default(1).notNull(),
    unitPrice: bigint("unit_price", { mode: "number" }).notNull(),
    total: bigint("total", { mode: "number" }).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    invoiceIdx: index("invoice_items_invoice_idx").on(table.invoiceId),
  })
);

export const payments = pgTable(
  "payments",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    invoiceId: bigint("invoice_id", { mode: "number" })
      .references(() => invoices.id)
      .notNull(),
    gateway: varchar("gateway", { length: 20 }).notNull(),
    gatewayTransactionId: varchar("gateway_transaction_id", { length: 255 }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    status: varchar("status", { length: 30 }).default("pending").notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    gatewayResponse: jsonb("gateway_response"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    invoiceIdx: index("payments_invoice_idx").on(table.invoiceId),
    gatewayIdx: index("payments_gateway_idx").on(table.gateway, table.gatewayTransactionId),
  })
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));
