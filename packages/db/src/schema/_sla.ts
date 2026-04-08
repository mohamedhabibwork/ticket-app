import {
  pgTable,
  bigint,
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const slaPolicies = pgTable(
  "sla_policies",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    isDefault: boolean("is_default").default(false).notNull(),
    businessHoursOnly: boolean("business_hours_only").default(true).notNull(),
    businessHoursConfig: jsonb("business_hours_config"),
    holidays: jsonb("holidays"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("sla_policies_org_idx").on(table.organizationId),
  })
);

export const slaPolicyTargets = pgTable(
  "sla_policy_targets",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    slaPolicyId: bigint("sla_policy_id", { mode: "number" })
      .references(() => slaPolicies.id)
      .notNull(),
    priorityId: bigint("priority_id", { mode: "number" })
      .references(() => lookups.id)
      .notNull(),
    firstResponseMinutes: integer("first_response_minutes").notNull(),
    resolutionMinutes: integer("resolution_minutes").notNull(),
    escalateAgentId: bigint("escalate_agent_id", { mode: "number" }).references((): any => users.id),
    escalateTeamId: bigint("escalate_team_id", { mode: "number" }).references((): any => teams.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    policyPriorityUnique: unique().on(table.slaPolicyId, table.priorityId),
  })
);

export const ticketSla = pgTable(
  "ticket_sla",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull()
      .unique(),
    slaPolicyId: bigint("sla_policy_id", { mode: "number" })
      .references(() => slaPolicies.id)
      .notNull(),
    firstResponseDueAt: timestamp("first_response_due_at", { withTimezone: true }).notNull(),
    resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }).notNull(),
    firstResponseBreached: boolean("first_response_breached").default(false).notNull(),
    resolutionBreached: boolean("resolution_breached").default(false).notNull(),
    firstResponseBreachedAt: timestamp("first_response_breached_at", { withTimezone: true }),
    resolutionBreachedAt: timestamp("resolution_breached_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    pausedDurationMinutes: integer("paused_duration_minutes").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketIdx: index("ticket_sla_ticket_idx").on(table.ticketId),
    firstResponseDueIdx: index("ticket_sla_first_response_due_idx").on(table.firstResponseDueAt),
    resolutionDueIdx: index("ticket_sla_resolution_due_idx").on(table.resolutionDueAt),
    breachedIdx: index("ticket_sla_breached_idx").on(table.firstResponseBreached, table.resolutionBreached),
  })
);

export const ticketCustomFields = pgTable(
  "ticket_custom_fields",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    label: varchar("label", { length: 150 }).notNull(),
    fieldType: varchar("field_type", { length: 30 }).notNull(),
    options: jsonb("options"),
    isRequired: boolean("is_required").default(false).notNull(),
    isVisibleToContact: boolean("is_visible_to_contact").default(false).notNull(),
    orderBy: integer("order_by").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("ticket_custom_fields_org_idx").on(table.organizationId),
  })
);

export const csatSurveys = pgTable(
  "csat_surveys",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    ticketId: bigint("ticket_id", { mode: "number" })
      .references(() => tickets.id)
      .notNull()
      .unique(),
    sentTo: varchar("sent_to", { length: 255 }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    rating: integer("rating"),
    comment: text("comment"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketIdx: index("csat_surveys_ticket_idx").on(table.ticketId),
    expiresIdx: index("csat_surveys_expires_idx").on(table.expiresAt),
  })
);

export const slaPoliciesRelations = relations(slaPolicies, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [slaPolicies.organizationId],
    references: [organizations.id],
  }),
  targets: many(slaPolicyTargets),
}));

export const slaPolicyTargetsRelations = relations(slaPolicyTargets, ({ one }) => ({
  slaPolicy: one(slaPolicies, {
    fields: [slaPolicyTargets.slaPolicyId],
    references: [slaPolicies.id],
  }),
  priority: one(lookups, {
    fields: [slaPolicyTargets.priorityId],
    references: [lookups.id],
  }),
  escalateAgent: one(users, {
    fields: [slaPolicyTargets.escalateAgentId],
    references: [users.id],
  }),
  escalateTeam: one(teams, {
    fields: [slaPolicyTargets.escalateTeamId],
    references: [teams.id],
  }),
}));

export const ticketSlaRelations = relations(ticketSla, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketSla.ticketId],
    references: [tickets.id],
  }),
  slaPolicy: one(slaPolicies, {
    fields: [ticketSla.slaPolicyId],
    references: [slaPolicies.id],
  }),
}));

export const ticketCustomFieldsRelations = relations(ticketCustomFields, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [ticketCustomFields.organizationId],
    references: [organizations.id],
  }),
  values: many(ticketCustomFieldValues),
}));

export const csatSurveysRelations = relations(csatSurveys, ({ one }) => ({
  ticket: one(tickets, {
    fields: [csatSurveys.ticketId],
    references: [tickets.id],
  }),
}));
