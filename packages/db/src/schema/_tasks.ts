import {
  pgTable,
  bigint,
  boolean,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const tasks = pgTable(
  "tasks",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    ticketId: bigint("ticket_id", { mode: "number" }).references((): any => tickets.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    statusId: bigint("status_id", { mode: "number" })
      .references(() => lookups.id)
      .notNull(),
    priorityId: bigint("priority_id", { mode: "number" }).references((): any => lookups.id),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: bigint("created_by", { mode: "number" }).references((): any => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): any => users.id),
    deletedBy: bigint("deleted_by", { mode: "number" }).references((): any => users.id),
  },
  (table) => ({
    orgIdx: index("tasks_org_idx").on(table.organizationId),
    ticketIdx: index("tasks_ticket_idx").on(table.ticketId),
  })
);

export const taskAssignees = pgTable(
  "task_assignees",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    taskId: bigint("task_id", { mode: "number" })
      .references(() => tasks.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    taskUserUnique: unique().on(table.taskId, table.userId),
  })
);

export const taskChecklistItems = pgTable(
  "task_checklist_items",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    taskId: bigint("task_id", { mode: "number" })
      .references(() => tasks.id)
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    orderBy: integer("order_by").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    taskIdx: index("task_checklist_items_task_idx").on(table.taskId),
  })
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tasks.organizationId],
    references: [organizations.id],
  }),
  ticket: one(tickets, {
    fields: [tasks.ticketId],
    references: [tickets.id],
  }),
  status: one(lookups, {
    fields: [tasks.statusId],
    references: [lookups.id],
  }),
  priority: one(lookups, {
    fields: [tasks.priorityId],
    references: [lookups.id],
  }),
  assignees: many(taskAssignees),
  checklistItems: many(taskChecklistItems),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAssignees.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskAssignees.userId],
    references: [users.id],
  }),
}));

export const taskChecklistItemsRelations = relations(taskChecklistItems, ({ one }) => ({
  task: one(tasks, {
    fields: [taskChecklistItems.taskId],
    references: [tasks.id],
  }),
}));
