import {
  pgTable,
  bigint,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./_organizations";

export const onPremiseLicenses = pgTable(
  "on_premise_licenses",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    licenseKey: varchar("license_key", { length: 500 }).notNull().unique(),
    productEdition: varchar("product_edition", { length: 100 }).notNull(),
    seatLimit: bigint("seat_limit", { mode: "number" }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastVerificationAt: timestamp("last_verification_at", { withTimezone: true }),
    signature: text("signature").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const onPremiseLicensesRelations = relations(onPremiseLicenses, ({ one }) => ({
  organization: one(organizations, {
    fields: [onPremiseLicenses.organizationId],
    references: [organizations.id],
  }),
}));
