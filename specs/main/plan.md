# Implementation Plan: Import/Export Excel Sheets with Queue

**Branch**: `002-import-export-excel` | **Date**: 2026-04-09 | **Spec**: [001-support-platform/spec.md](./001-support-platform/spec.md)
**Input**: Add import/export Excel sheet functionality for all entities using background queue

## Summary

Implement bulk data import and export capabilities for the support platform using Excel files processed via BullMQ workers. Export generates downloadable Excel files from database queries; Import reads Excel files and creates/updates records through a staged queue process with validation and error reporting.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Hono 4.x, ORPC 0.4.x, Drizzle ORM 0.45.x, BullMQ, xlsx (SheetJS)  
**Storage**: PostgreSQL 16+, Redis (queues), S3-compatible (file storage)  
**Testing**: bun test, integration tests  
**Target Platform**: Linux server (Cloudflare Workers compatible)  
**Project Type**: API service with background workers  
**Performance Goals**: Export up to 50k records per file, Import processing at 1000 records/min  
**Constraints**: <30s export generation, <5min import for 10k records, file size limit 50MB  
**Scale/Scope**: Multi-tenant, organization-scoped data isolation

## Constitution Check

- [x] **G1**: Queue-based async processing for long-running operations
- [x] **G2**: Multi-tenant isolation via organization_id filtering
- [x] **G3**: Progress tracking and error reporting for imports
- [x] **G4**: File validation and sanitization before processing

## Project Structure

### Source Code (this feature)

```text
packages/
├── queue/src/workers/
│   ├── excel-export.worker.ts    # Export queue worker
│   └── excel-import.worker.ts    # Import queue worker
├── api/src/routers/
│   └── excel.ts                  # Export/Import API endpoints
packages/db/src/schema/
└── _excel-jobs.ts                # Import/export job tracking tables

apps/server/src/
└── index.ts                       # Register worker routes
```

### Documentation (this feature)

```text
specs/002-import-export-excel/
├── plan.md              # This file
├── research.md          # Technology decisions
├── data-model.md        # New schema additions
└── contracts/           # API contracts
    └── excel.yaml       # OpenAPI spec
```

## Complexity Tracking

N/A - No violations

---

## Phase 0: Research

### Open Questions

| Item            | Question                            | Resolution                                                    |
| --------------- | ----------------------------------- | ------------------------------------------------------------- |
| Excel library   | xlsx (SheetJS) vs exceljs vs other? | xlsx: best maintained, widest browser support, WASM available |
| File storage    | S3 presigned URLs vs direct upload? | Presigned URLs for large exports, direct for imports          |
| Import strategy | Create only vs upsert?              | Both: create new, update existing by unique field             |

---

## Phase 1: Design & Contracts

### Data Model Changes

**New table: `excel_export_jobs`**

```typescript
export const excelExportJobs = pgTable("excel_export_jobs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  organizationId: bigint("organization_id", { mode: "number" })
    .references(() => organizations.id)
    .notNull(),
  userId: bigint("user_id", { mode: "number" })
    .references(() => users.id)
    .notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // tickets, contacts, users, kb_articles
  filters: jsonb("filters"),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, processing, completed, failed
  fileUrl: text("file_url"),
  recordCount: integer("record_count"),
  errorMessage: text("error_message"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**New table: `excel_import_jobs`**

```typescript
export const excelImportJobs = pgTable("excel_import_jobs", {
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
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, validating, processing, completed, failed
  mode: varchar("mode", { length: 20 }).default("create").notNull(), // create, upsert
  matchField: varchar("match_field", { length: 50 }), // unique field for upsert
  totalRows: integer("total_rows"),
  processedRows: integer("processed_rows").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  errors: jsonb("errors"), // [{row: number, field: string, message: string}]
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### API Contracts

**POST /api/excel/export** - Create export job

```yaml
Request:
  organizationId: number
  entityType: "tickets" | "contacts" | "users" | "kb_articles" | "saved_replies"
  filters: object (entity-specific)
Response:
  jobId: string
  status: "pending"
```

**GET /api/excel/export/:jobId** - Check export status

```yaml
Response:
  jobId: string
  status: "pending" | "processing" | "completed" | "failed"
  fileUrl?: string (when completed)
  recordCount?: number
  errorMessage?: string
```

**POST /api/excel/import** - Upload and start import

```yaml
Request:
  organizationId: number
  entityType: string
  file: multipart (Excel file)
  mode: "create" | "upsert"
  matchField?: string (required for upsert)
Response:
  jobId: string
  status: "pending"
```

**GET /api/excel/import/:jobId** - Check import status

```yaml
Response:
  jobId: string
  status: "validating" | "processing" | "completed" | "failed"
  totalRows: number
  processedRows: number
  successCount: number
  errorCount: number
  errors: [{row, field, message}]
```

### Entity Export Mappings

| Entity        | Columns                                                                                  | Filters                                |
| ------------- | ---------------------------------------------------------------------------------------- | -------------------------------------- |
| tickets       | ref, subject, status, priority, channel, contact, assignee, team, created_at, updated_at | status, priority, date_range, assignee |
| contacts      | email, first_name, last_name, company, phone, type, created_at                           | type, date_range                       |
| users         | email, first_name, last_name, role, team, status, created_at                             | role, status                           |
| kb_articles   | title, category, status, locale, author, created_at, updated_at                          | category, status, locale               |
| saved_replies | title, folder, content, scope, created_at                                                | folder, scope                          |

---

## Implementation Notes

1. **Queue Design**: Separate queues for export (`excel:export`) and import (`excel:import`) to allow independent scaling
2. **Worker Concurrency**: Export workers run at concurrency 2; Import at concurrency 1 to prevent DB locks
3. **Chunked Processing**: Import processes rows in batches of 100 for memory efficiency
4. **File Validation**: Check file magic bytes, size limit, sheet structure before queuing
5. **Progress Updates**: Import job updates progress every 50 rows via Redis pub/sub
