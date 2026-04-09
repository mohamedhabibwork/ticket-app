# Research: Import/Export Excel with Queue

**Date**: 2026-04-09 | **Status**: Complete

---

## 1. Excel Library Selection

### Decision

**xlsx** (SheetJS) - Community edition with CFBF support

### Rationale

- Best maintained TypeScript types
- Supports both .xls and .xlsx formats
- Works in Node.js and browser environments
- No native dependencies (pure JS)
- WASM version available for edge runtimes
- Widest adoption (millions of weekly downloads)

### Alternatives Considered

| Alternative | Rejected Because                       |
| ----------- | -------------------------------------- |
| exceljs     | Larger bundle, poor TypeScript support |
| officegen   | Limited formatting options             |
| xlsx-style  | Deprecated, no maintenance             |

---

## 2. File Upload Strategy

### Decision

**S3 presigned URLs** for exports; **multipart/form-data** direct upload for imports with subsequent validation

### Rationale

- Exports can be large (50k+ rows) - direct server memory issue
- Presigned URLs allow direct browser-to-S3 transfer
- Imports need server-side validation before processing
- Direct upload allows virus scanning and format validation

### Export Flow

1. Client requests export → API creates job record
2. API returns presigned PUT URL for upload location
3. Worker generates Excel, uploads directly to S3
4. Worker updates job with file URL
5. Client downloads via presigned GET URL

### Import Flow

1. Client uploads file → API validates and stores in temp location
2. API creates import job, queues worker
3. Worker validates file structure, reports errors if invalid
4. Worker processes rows in batches, updates progress
5. On completion, worker cleans up temp file

---

## 3. Import Strategy: Create vs Upsert

### Decision

Support both **create-only** and **upsert** modes

### Create Mode

- Insert new records only
- Skip rows where unique constraint fails (configurable: skip or abort)

### Upsert Mode

- Match existing records by configurable unique field (email, external_id, etc.)
- Update matched records with new values
- Create new records when no match found

### Rationale

- Different use cases require different strategies
- Bulk import often used for data migration (upsert)
- Fresh imports from external systems (create)
- Clear UI separation between modes

---

## 4. Row Processing Strategy

### Decision

**Batch processing** with 100-row chunks, database transactions per batch

### Rationale

- Memory efficiency: don't load entire file into memory
- Transaction per batch: partial failure is recoverable
- Concurrency control: only 1 import worker per organization to prevent locks
- Progress tracking: update job record every 50 rows

### Error Handling

- Collect errors per row with field-level detail
- Continue processing on non-critical errors (missing optional field)
- Abort on critical errors (invalid foreign key, constraint violation)
- Return detailed error report with row numbers

---

## 5. Entity Coverage

### Decision

Support export/import for all major entities

### Entities Covered

| Entity        | Import Support   | Export Support |
| ------------- | ---------------- | -------------- |
| Tickets       | Yes              | Yes            |
| Contacts      | Yes              | Yes            |
| Users         | Yes (admin only) | Yes            |
| KB Articles   | Yes              | Yes            |
| Saved Replies | Yes              | Yes            |
| Tags          | Yes              | Yes            |

### Excluded (complex relations)

- Ticket messages (timeline too complex)
- Workflows (JSON rule structure)
- Billing data (security concerns)

---

## 6. Queue Architecture

### Decision

Separate queues: `excel:export` and `excel:import`

### Queue Configuration

| Queue        | Concurrency | Retries | Priority |
| ------------ | ----------- | ------- | -------- |
| excel:export | 2           | 3       | 5        |
| excel:import | 1           | 3       | 10       |

### Rationale

- Import has higher priority (user waiting)
- Import lower concurrency (DB write locks)
- Export can run in parallel (read-only)
- Separate queues allow independent scaling

---

## 7. File Size Limits

### Decision

- Max file size: 50MB
- Max rows: 50,000 per import
- Max concurrent exports: 3 per organization

### Rationale

- Memory constraints in edge workers
- Typical spreadsheet limits
- Prevent resource exhaustion attacks
- Queue fairness between organizations
