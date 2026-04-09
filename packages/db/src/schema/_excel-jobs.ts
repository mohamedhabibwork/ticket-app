import {
  pgTable,
  bigint,
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

export const excelExportJobs = pgTable(
  "excel_export_jobs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    filters: jsonb("filters"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    fileUrl: text("file_url"),
    recordCount: integer("record_count"),
    errorMessage: text("error_message"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgStatusIdx: index("excel_export_jobs_org_status_idx").on(table.organizationId, table.status),
    userIdIdx: index("excel_export_jobs_user_id_idx").on(table.userId),
  }),
);

export const excelExportJobRelations = relations(excelExportJobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [excelExportJobs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [excelExportJobs.userId],
    references: [users.id],
  }),
}));

export const excelImportJobs = pgTable(
  "excel_import_jobs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    organizationId: bigint("organization_id", { mode: "number" })
      .references(() => organizations.id)
      .notNull(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id)
      .notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    fileUrl: text("file_url").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    mode: varchar("mode", { length: 20 }).default("create").notNull(),
    matchField: varchar("match_field", { length: 50 }),
    totalRows: integer("total_rows"),
    processedRows: integer("processed_rows").default(0),
    successCount: integer("success_count").default(0),
    errorCount: integer("error_count").default(0),
    errors: jsonb("errors"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgStatusIdx: index("excel_import_jobs_org_status_idx").on(table.organizationId, table.status),
    userIdIdx: index("excel_import_jobs_user_id_idx").on(table.userId),
  }),
);

export const excelImportJobRelations = relations(excelImportJobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [excelImportJobs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [excelImportJobs.userId],
    references: [users.id],
  }),
}));
