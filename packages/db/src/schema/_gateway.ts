import {
  pgTable,
  bigint,
  boolean,
  jsonb,
  text,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./_organizations";
import { subscriptions } from "./_billing";
import { paymentMethods } from "./_paymentMethods";
import { invoices } from "./_invoices";

export const stripeCustomers = pgTable(
  "stripe_customers",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull()
      .unique(),
    customerId: varchar("customer_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }),
    defaultPaymentMethodId: varchar("default_payment_method_id", { length: 255 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("stripe_customers_org_idx").on(table.organizationId),
    customerIdx: index("stripe_customers_customer_idx").on(table.customerId),
  }),
);

export const stripeSubscriptions = pgTable(
  "stripe_subscriptions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    subscriptionId: bigint("subscription_id", { mode: "number" })
      .references(() => subscriptions.id)
      .notNull()
      .unique(),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).notNull().unique(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    status: varchar("status", { length: 50 }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    trialStart: timestamp("trial_start", { withTimezone: true }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subscriptionIdx: index("stripe_subscriptions_sub_idx").on(table.subscriptionId),
    stripeSubIdx: index("stripe_subscriptions_stripe_idx").on(table.stripeSubscriptionId),
  }),
);

export const stripePaymentMethods = pgTable(
  "stripe_payment_methods",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    paymentMethodId: bigint("payment_method_id", { mode: "number" })
      .references(() => paymentMethods.id)
      .notNull()
      .unique(),
    stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 255 }).notNull().unique(),
    brand: varchar("brand", { length: 50 }),
    last4: varchar("last4", { length: 4 }),
    expiryMonth: varchar("expiry_month", { length: 2 }),
    expiryYear: varchar("expiry_year", { length: 4 }),
    funding: varchar("funding", { length: 20 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    methodIdx: index("stripe_payment_methods_method_idx").on(table.paymentMethodId),
    stripeIdx: index("stripe_payment_methods_stripe_idx").on(table.stripePaymentMethodId),
  }),
);

export const paytabsTransactions = pgTable(
  "paytabs_transactions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    paymentMethodId: bigint("payment_method_id", { mode: "number" }).references(
      () => paymentMethods.id,
    ),
    invoiceId: bigint("invoice_id", { mode: "number" }).references(() => invoices.id),
    transactionId: varchar("transaction_id", { length: 255 }).notNull().unique(),
    referenceId: varchar("reference_id", { length: 255 }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    cardBrand: varchar("card_brand", { length: 50 }),
    cardLast4: varchar("card_last4", { length: 4 }),
    responseCode: varchar("response_code", { length: 20 }),
    responseMessage: text("response_message"),
    gatewayResponse: jsonb("gateway_response"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("paytabs_transactions_org_idx").on(table.organizationId),
    transactionIdx: index("paytabs_transactions_transaction_idx").on(table.transactionId),
    invoiceIdx: index("paytabs_transactions_invoice_idx").on(table.invoiceId),
  }),
);

export const stripeCustomersRelations = relations(stripeCustomers, ({ one }) => ({
  organization: one(organizations, {
    fields: [stripeCustomers.organizationId],
    references: [organizations.id],
  }),
}));

export const stripeSubscriptionsRelations = relations(stripeSubscriptions, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [stripeSubscriptions.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const stripePaymentMethodsRelations = relations(stripePaymentMethods, ({ one }) => ({
  paymentMethod: one(paymentMethods, {
    fields: [stripePaymentMethods.paymentMethodId],
    references: [paymentMethods.id],
  }),
}));

export const paytabsTransactionsRelations = relations(paytabsTransactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [paytabsTransactions.organizationId],
    references: [organizations.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [paytabsTransactions.paymentMethodId],
    references: [paymentMethods.id],
  }),
  invoice: one(invoices, {
    fields: [paytabsTransactions.invoiceId],
    references: [invoices.id],
  }),
}));
