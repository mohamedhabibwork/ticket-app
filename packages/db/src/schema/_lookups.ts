import {
  pgTable,
  bigint,
  boolean,
  integer,
  text,
  timestamp,
  uuid,
  jsonb,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./_organizations";
import { users } from "./_users";

export const lookupTypes = pgTable("lookup_types", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 150 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lookups = pgTable(
  "lookups",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    lookupTypeId: bigint("lookup_type_id", { mode: "number" })
      .references(() => lookupTypes.id)
      .notNull(),
    parentId: bigint("parent_id", { mode: "number" }).references((): any => lookups.id),
    organizationId: bigint("organization_id", { mode: "number" }).references((): any => organizations.id),
    name: varchar("name", { length: 100 }).notNull(),
    label: varchar("label", { length: 150 }).notNull(),
    labelAr: varchar("label_ar", { length: 150 }),
    color: varchar("color", { length: 7 }),
    icon: varchar("icon", { length: 100 }),
    orderBy: integer("order_by").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    lookupTypeOrgIdx: index("lookups_lookup_type_org_idx").on(
      table.lookupTypeId,
      table.organizationId
    ),
    parentIdx: index("lookups_parent_idx").on(table.parentId),
  })
);

export const lookupTypesRelations = relations(lookupTypes, ({ many }) => ({
  lookups: many(lookups),
}));

export const lookupsRelations = relations(lookups, ({ one, many }) => ({
  lookupType: one(lookupTypes, {
    fields: [lookups.lookupTypeId],
    references: [lookupTypes.id],
  }),
  parent: one(lookups, {
    fields: [lookups.parentId],
    references: [lookups.id],
    relationName: "parentChild",
  }),
  children: many(lookups, { relationName: "parentChild" }),
  organization: one(organizations, {
    fields: [lookups.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [lookups.createdBy],
    references: [users.id],
    relationName: "lookupCreator",
  }),
  updatedByUser: one(users, {
    fields: [lookups.updatedBy],
    references: [users.id],
    relationName: "lookupUpdater",
  }),
}));
