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
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./_users";
import { organizations } from "./_organizations";
import { lookups } from "./_lookups";
import { tickets } from "./_tickets";
import { tags } from "./_tickets";

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
    orgEmailIdx: index("contacts_org_email_idx").on(table.organizationId, table.email),
    orgIdx: index("contacts_org_idx").on(table.organizationId),
    emailIdx: index("contacts_email_idx").on(table.email),
    phoneIdx: index("contacts_phone_idx").on(table.phone),
    externalIdIdx: index("contacts_external_id_idx").on(table.externalId),
  }),
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
  }),
);

export const tagCategories = pgTable(
  "tag_categories",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    nameAr: varchar("name_ar", { length: 100 }),
    color: varchar("color", { length: 7 }),
    orderBy: integer("order_by").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgNameUnique: unique().on(table.organizationId, table.name),
    orgIdx: index("tag_categories_org_idx").on(table.organizationId),
  }),
);

export const contactTags = pgTable(
  "contact_tags",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    contactId: bigint("contact_id", { mode: "number" })
      .references(() => contacts.id)
      .notNull(),
    tagId: bigint("tag_id", { mode: "number" })
      .references(() => tags.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    contactTagUnique: unique().on(table.contactId, table.tagId),
    contactIdx: index("contact_tags_contact_idx").on(table.contactId),
    tagIdx: index("contact_tags_tag_idx").on(table.tagId),
  }),
);

export const contactViews = pgTable(
  "contact_views",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" }).references((): any => users.id),
    name: varchar("name", { length: 150 }).notNull(),
    filters: jsonb("filters").notNull(),
    sortBy: varchar("sort_by", { length: 50 }).default("created_at").notNull(),
    sortDir: varchar("sort_dir", { length: 4 }).default("desc").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("contact_views_org_idx").on(table.organizationId),
    userIdx: index("contact_views_user_idx").on(table.userId),
  }),
);

export const contactMerges = pgTable(
  "contact_merges",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    sourceContactId: bigint("source_contact_id", { mode: "number" })
      .references(() => contacts.id)
      .notNull(),
    targetContactId: bigint("target_contact_id", { mode: "number" })
      .references(() => contacts.id)
      .notNull(),
    mergedAt: timestamp("merged_at", { withTimezone: true }).defaultNow().notNull(),
    mergedBy: bigint("merged_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    sourceIdx: index("contact_merges_source_idx").on(table.sourceContactId),
    targetIdx: index("contact_merges_target_idx").on(table.targetContactId),
  }),
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
  tags: many(contactTags),
  mergedAsSource: many(contactMerges, { relationName: "sourceContact" }),
  mergedAsTarget: many(contactMerges, { relationName: "targetContact" }),
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

export const tagCategoriesRelations = relations(tagCategories, ({ one, _many }) => ({
  organization: one(organizations, {
    fields: [tagCategories.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [tagCategories.createdBy],
    references: [users.id],
  }),
}));

export const contactTagsRelations = relations(contactTags, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactTags.contactId],
    references: [contacts.id],
  }),
  tag: one(tags, {
    fields: [contactTags.tagId],
    references: [tags.id],
  }),
  createdByUser: one(users, {
    fields: [contactTags.createdBy],
    references: [users.id],
  }),
}));

export const contactViewsRelations = relations(contactViews, ({ one }) => ({
  organization: one(organizations, {
    fields: [contactViews.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [contactViews.userId],
    references: [users.id],
  }),
}));

export const contactMergesRelations = relations(contactMerges, ({ one }) => ({
  sourceContact: one(contacts, {
    fields: [contactMerges.sourceContactId],
    references: [contacts.id],
    relationName: "sourceContact",
  }),
  targetContact: one(contacts, {
    fields: [contactMerges.targetContactId],
    references: [contacts.id],
    relationName: "targetContact",
  }),
  mergedByUser: one(users, {
    fields: [contactMerges.mergedBy],
    references: [users.id],
  }),
}));
