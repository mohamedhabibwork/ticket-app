import {
  pgTable,
  bigint,
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
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    slaPolicyId: bigint("sla_policy_id", { mode: "number" }).references(() => slaPolicies.id),
    teamId: bigint("team_id", { mode: "number" }).references(() => teams.id),
    priorityId: bigint("priority_id", { mode: "number" }).references(() => lookups.id),
    parentCategoryId: bigint("parent_category_id", { mode: "number" }).references((): any => ticketCategories.id),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  },
  (table) => ({
    orgIdx: index("ticket_categories_org_idx").on(table.organizationId),
    parentIdx: index("ticket_categories_parent_idx").on(table.parentCategoryId),
  })
);

export const ticketCategoriesRelations = relations(ticketCategories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [ticketCategories.organizationId],
    references: [organizations.id],
  }),
  slaPolicy: one(slaPolicies, {
    fields: [ticketCategories.slaPolicyId],
    references: [slaPolicies.id],
  }),
  team: one(teams, {
    fields: [ticketCategories.teamId],
    references: [teams.id],
  }),
  priority: one(lookups, {
    fields: [ticketCategories.priorityId],
    references: [lookups.id],
  }),
  parentCategory: one(ticketCategories, {
    fields: [ticketCategories.parentCategoryId],
    references: [ticketCategories.id],
    relationName: "parentCategory",
  }),
  childCategories: many(ticketCategories, { relationName: "parentCategory" }),
}));
