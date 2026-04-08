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

export const contacts = pgTable(
  "contacts",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 30 }),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    company: varchar("company", { length: 200 }),
    avatarUrl: text("avatar_url"),
    contactTypeId: bigint("contact_type_id", { mode: "number" }).references((): any => lookups.id),
    language: varchar("language", { length: 10 }),
    timezone: varchar("timezone", { length: 50 }),
    isBlocked: boolean("is_blocked").default(false).notNull(),
    externalId: varchar("external_id", { length: 255 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgEmailUnique: unique().on(table.organizationId, table.email),
    orgIdx: index("contacts_org_idx").on(table.organizationId),
    emailIdx: index("contacts_email_idx").on(table.email),
    phoneIdx: index("contacts_phone_idx").on(table.phone),
    externalIdIdx: index("contacts_external_id_idx").on(table.externalId),
  })
);

export const contactNotes = pgTable(
  "contact_notes",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    contactId: bigint("contact_id", { mode: "number" })
      .references(() => contacts.id)
      .notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    contactIdx: index("contact_notes_contact_idx").on(table.contactId),
  })
);

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
  contactType: one(lookups, {
    fields: [contacts.contactTypeId],
    references: [lookups.id],
  }),
  notes: many(contactNotes),
  tickets: many(tickets),
}));

export const contactNotesRelations = relations(contactNotes, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactNotes.contactId],
    references: [contacts.id],
  }),
  createdByUser: one(users, {
    fields: [contactNotes.createdBy],
    references: [users.id],
  }),
}));
