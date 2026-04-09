# Data Model: Import/Export Excel Sheets

**Date**: 2026-04-09 | **Source**: Implementation plan for 002-import-export-excel
**ORM**: Drizzle ORM 0.45.x | **Database**: PostgreSQL 16+

---

## Schema Conventions

Same as existing 001-support-platform:

- Primary Key (internal): `BIGSERIAL`
- Primary Key (public-facing): `UUID` via `gen_random_uuid()`
- Timestamps: `TIMESTAMPTZ`, always UTC
- Naming: `snake_case`

---

## New Tables

### 1. Excel Export Jobs

```typescript
// packages/db/src/schema/_excel-jobs.ts

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
```

### 2. Excel Import Jobs

```typescript
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
```

---

## Entity Import Field Mappings

### Tickets

| Excel Column   | Database Field    | Required | Type            |
| -------------- | ----------------- | -------- | --------------- |
| subject        | subject           | Yes      | text            |
| description    | description_html  | No       | text            |
| status         | status_id         | Yes      | lookup (name)   |
| priority       | priority_id       | Yes      | lookup (name)   |
| contact_email  | contact_id        | No       | fk (by email)   |
| assignee_email | assigned_agent_id | No       | fk (by email)   |
| team_name      | assigned_team_id  | No       | fk (by name)    |
| tags           | tags              | No       | comma-separated |

### Contacts

| Excel Column | Database Field  | Required | Type          |
| ------------ | --------------- | -------- | ------------- |
| email        | email           | Yes      | text (unique) |
| first_name   | first_name      | No       | text          |
| last_name    | last_name       | No       | text          |
| phone        | phone           | No       | text          |
| company      | company         | No       | text          |
| type         | contact_type_id | No       | lookup (name) |

### Users

| Excel Column | Database Field | Required | Type          |
| ------------ | -------------- | -------- | ------------- |
| email        | email          | Yes      | text (unique) |
| first_name   | first_name     | Yes      | text          |
| last_name    | last_name      | Yes      | text          |
| role         | role_slug      | Yes      | text          |
| team         | team_name      | No       | text          |

### KB Articles

| Excel Column | Database Field | Required | Type          |
| ------------ | -------------- | -------- | ------------- |
| title        | title          | Yes      | text          |
| content      | body           | Yes      | text (HTML)   |
| category     | category_id    | Yes      | fk (by name)  |
| status       | status         | Yes      | lookup (name) |
| locale       | locale         | No       | text          |

### Saved Replies

| Excel Column | Database Field | Required | Type |
| ------------ | -------------- | -------- | ---- |
| title        | title          | Yes      | text |
| content      | content        | Yes      | text |
| folder       | folder_name    | No       | text |
| scope        | scope          | No       | enum |

---

## Indexes Summary

| Table               | Indexes                                  |
| ------------------- | ---------------------------------------- |
| `excel_export_jobs` | `(organization_id, status)`, `(user_id)` |
| `excel_import_jobs` | `(organization_id, status)`, `(user_id)` |

---

## Relationships Summary

```
organizations
  └── excel_export_jobs (1:N)
  └── excel_import_jobs (1:N)

users
  └── excel_export_jobs (1:N)
  └── excel_import_jobs (1:N)
```

---

## Migration Commands

```bash
bun db:generate
bun db:migrate
```
