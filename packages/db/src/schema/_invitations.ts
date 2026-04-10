import { pgTable, bigint, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./_organizations";
import { users, roles } from "./_users";

export const invitations = pgTable(
  "invitations",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    invitedBy: bigint("invited_by", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgEmailUnique: unique().on(table.organizationId, table.email),
    tokenUnique: unique().on(table.token),
    orgIdx: index("invitations_org_idx").on(table.organizationId),
    emailIdx: index("invitations_email_idx").on(table.email),
  }),
);

export const invitationRoles = pgTable(
  "invitation_roles",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    invitationId: bigint("invitation_id", { mode: "number" })
      .references(() => invitations.id)
      .notNull(),
    roleId: bigint("role_id", { mode: "number" })
      .references(() => roles.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    invitationRoleUnique: unique().on(table.invitationId, table.roleId),
  }),
);

export const invitationsRelations = relations(invitations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
    relationName: "invitedBy",
  }),
  roles: many(invitationRoles),
}));

export const invitationRolesRelations = relations(invitationRoles, ({ one }) => ({
  invitation: one(invitations, {
    fields: [invitationRoles.invitationId],
    references: [invitations.id],
  }),
  role: one(roles, {
    fields: [invitationRoles.roleId],
    references: [roles.id],
  }),
}));
