import { pgTable, bigint, varchar, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./_organizations";
import { contacts } from "./_contacts";
import { users } from "./_users";

export const gdprRequests = pgTable("gdpr_requests", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  contactId: bigint("contact_id", { mode: "number" })
    .references(() => contacts.id)
    .notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  dataJson: text("data_json"),
  requestedBy: bigint("requested_by", { mode: "number" })
    .references(() => users.id)
    .notNull(),
  processedBy: bigint("processed_by", { mode: "number" }).references(() => users.id),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gdprRequestsRelations = relations(gdprRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [gdprRequests.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [gdprRequests.contactId],
    references: [contacts.id],
  }),
  requestedByUser: one(users, {
    fields: [gdprRequests.requestedBy],
    references: [users.id],
    relationName: "gdprRequester",
  }),
  processedByUser: one(users, {
    fields: [gdprRequests.processedBy],
    references: [users.id],
  }),
}));
