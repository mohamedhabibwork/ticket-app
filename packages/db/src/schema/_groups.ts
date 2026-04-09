import { pgTable, bigint, uuid, varchar, text, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./_organizations";
import { teams, users } from "./_users";

export const groups = pgTable(
  "groups",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    defaultTeamId: bigint("default_team_id", { mode: "number" }).references((): any => teams.id),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("groups_org_idx").on(table.organizationId),
  })
);

export const groupsRelations = relations(groups, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [groups.organizationId],
    references: [organizations.id],
  }),
  defaultTeam: one(teams, {
    fields: [groups.defaultTeamId],
    references: [teams.id],
  }),
  createdByUser: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [groups.updatedBy],
    references: [users.id],
  }),
  deletedByUser: one(users, {
    fields: [groups.deletedBy],
    references: [users.id],
  }),
  teams: many(teams),
}));
