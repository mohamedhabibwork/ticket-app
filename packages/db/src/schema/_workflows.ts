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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./_organizations";
import { tickets } from "./_tickets";
import { users } from "./_users";

export const workflows = pgTable(
  "workflows",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    description: text("description"),
    trigger: varchar("trigger", { length: 50 }).notNull(),
    conditions: jsonb("conditions").notNull(),
    actions: jsonb("actions").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("workflows_org_idx").on(table.organizationId),
  })
);

export const workflowExecutionLogs = pgTable(
  "workflow_execution_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    workflowId: bigint("workflow_id", { mode: "number" })
      .references(() => workflows.id)
      .notNull(),
    ticketId: bigint("ticket_id", { mode: "number" }).references((): any => tickets.id),
    executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow().notNull(),
    trigger: varchar("trigger", { length: 50 }).notNull(),
    conditionsResult: jsonb("conditions_result"),
    actionsResult: jsonb("actions_result"),
    error: text("error"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workflowExecutedAtIdx: index("workflow_execution_logs_workflow_executed_at_idx").on(
      table.workflowId,
      table.executedAt
    ),
    ticketIdx: index("workflow_execution_logs_ticket_idx").on(table.ticketId),
  })
);

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workflows.organizationId],
    references: [organizations.id],
  }),
  executionLogs: many(workflowExecutionLogs),
}));

export const workflowExecutionLogsRelations = relations(workflowExecutionLogs, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowExecutionLogs.workflowId],
    references: [workflows.id],
  }),
  ticket: one(tickets, {
    fields: [workflowExecutionLogs.ticketId],
    references: [tickets.id],
  }),
}));
