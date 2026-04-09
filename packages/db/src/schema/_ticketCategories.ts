import {
  pgTable,
  bigint,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./_organizations";
import { slaPolicies } from "./_sla";
import { teams, users } from "./_users";
import { lookups } from "./_lookups";

export const ticketCategories = pgTable(
  "ticket_categories",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 100 }),
    color: varchar("color", { length: 7 }),
    defaultPriorityId: bigint("default_priority_id", { mode: "number" }).references(
      () => lookups.id,
    ),
    defaultTeamId: bigint("default_team_id", { mode: "number" }).references(() => teams.id),
    defaultSlaPolicyId: bigint("default_sla_policy_id", { mode: "number" }).references(
      () => slaPolicies.id,
    ),
    isActive: boolean("is_active").default(true).notNull(),
    orderBy: integer("order_by").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    orgIdx: index("ticket_categories_org_idx").on(table.organizationId),
  }),
);

export const ticketCategoriesRelations = relations(ticketCategories, ({ one }) => ({
  organization: one(organizations, {
    fields: [ticketCategories.organizationId],
    references: [organizations.id],
  }),
  slaPolicy: one(slaPolicies, {
    fields: [ticketCategories.defaultSlaPolicyId],
    references: [slaPolicies.id],
  }),
  team: one(teams, {
    fields: [ticketCategories.defaultTeamId],
    references: [teams.id],
  }),
  priority: one(lookups, {
    fields: [ticketCategories.defaultPriorityId],
    references: [lookups.id],
  }),
  createdByUser: one(users, {
    fields: [ticketCategories.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [ticketCategories.updatedBy],
    references: [users.id],
  }),
  deletedByUser: one(users, {
    fields: [ticketCategories.deletedBy],
    references: [users.id],
  }),
}));
