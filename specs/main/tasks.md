# Tasks: Import/Export Excel Sheets with Queue

**Feature**: 002-import-export-excel | **Date**: 2026-04-09
**Stack**: TypeScript 5.x, Hono 4.x, ORPC 0.4.x, Drizzle ORM 0.45.x, BullMQ, xlsx

---

## Phase 1: Setup

- [ ] T001 Add `xlsx` dependency to `packages/queue/package.json`

## Phase 2: Foundational

- [ ] T002 Create `packages/db/src/schema/_excel-jobs.ts` with `excelExportJobs` and `excelImportJobs` tables per data-model.md
- [ ] T003 Add `_excel-jobs` export to `packages/db/src/schema/index.ts`
- [ ] T004 Add excel export queue to `packages/queue/src/queue.ts` with `excel:export` queue name
- [ ] T005 Add excel import queue to `packages/queue/src/queue.ts` with `excel:import` queue name

## Phase 3: Excel Export

- [ ] T006 Create `packages/queue/src/workers/excel-export.worker.ts` with `ExcelExportJobData` interface
- [ ] T007 [P] Implement export query builder for tickets entity in `excel-export.worker.ts`
- [ ] T008 [P] Implement export query builder for contacts entity in `excel-export.worker.ts`
- [ ] T009 [P] Implement export query builder for users entity in `excel-export.worker.ts`
- [ ] T010 [P] Implement export query builder for kb_articles entity in `excel-export.worker.ts`
- [ ] T011 [P] Implement export query builder for saved_replies entity in `excel-export.worker.ts`
- [ ] T012 Implement Excel file generation using xlsx library in `excel-export.worker.ts`
- [ ] T013 Implement S3 presigned URL upload in `excel-export.worker.ts`
- [ ] T014 Create `packages/api/src/routers/excel.ts` with ORPC router
- [ ] T015 Implement `createExportJob` endpoint in `packages/api/src/routers/excel.ts`
- [ ] T016 Implement `getExportJobStatus` endpoint in `packages/api/src/routers/excel.ts`
- [ ] T017 Implement `downloadExportFile` endpoint in `packages/api/src/routers/excel.ts`

## Phase 4: Excel Import

- [ ] T018 Create `packages/queue/src/workers/excel-import.worker.ts` with `ExcelImportJobData` interface
- [ ] T019 Implement file validation (magic bytes, size limit, sheet structure) in `excel-import.worker.ts`
- [ ] T020 [P] Implement Excel row parser for tickets in `excel-import.worker.ts`
- [ ] T021 [P] Implement Excel row parser for contacts in `excel-import.worker.ts`
- [ ] T022 [P] Implement Excel row parser for users in `excel-import.worker.ts`
- [ ] T023 [P] Implement Excel row parser for kb_articles in `excel-import.worker.ts`
- [ ] T024 [P] Implement Excel row parser for saved_replies in `excel-import.worker.ts`
- [ ] T025 Implement batch processing (100-row chunks) with DB transactions in `excel-import.worker.ts`
- [ ] T026 Implement upsert logic (match by unique field) in `excel-import.worker.ts`
- [ ] T027 Implement error collection with row/field details in `excel-import.worker.ts`
- [ ] T028 Implement `createImportJob` endpoint in `packages/api/src/routers/excel.ts`
- [ ] T029 Implement `getImportJobStatus` endpoint in `packages/api/src/routers/excel.ts`

## Phase 5: Integration & Polish

- [ ] T030 Register excel router in `apps/server/src/index.ts`
- [ ] T031 Update `apps/server/src/index.ts` to start excel export worker on server boot
- [ ] T032 Update `apps/server/src/index.ts` to start excel import worker on server boot
- [ ] T033 Add file size limit validation (50MB max) in import endpoint
- [ ] T034 Add max rows validation (50k max) in import endpoint
- [ ] T035 Add concurrent export limit (3 per organization) in createExportJob

---

## Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← T002, T003, T004, T005
    ↓
Phase 3 (Export) ← T006 depends on T004
Phase 4 (Import) ← T018 depends on T005
    ↓
Phase 5 (Integration) ← T030, T031, T032 depend on T015-T017 and T028-T029
```

## Parallel Opportunities

| Tasks                        | Reason                                            |
| ---------------------------- | ------------------------------------------------- |
| T007, T008, T009, T010, T011 | Different entity export handlers, no dependencies |
| T020, T021, T022, T023, T024 | Different entity import parsers, no dependencies  |
| T006, T018                   | Export and import workers are independent         |

## Independent Test Criteria

### Export (T006-T017)

- Export job created with pending status returns jobId
- Export status transitions: pending → processing → completed/failed
- Completed export returns valid S3 presigned download URL
- Export generates correct column headers for each entity type
- Filters correctly narrow exported data

### Import (T018-T029)

- Import job created with pending status returns jobId
- Import status transitions: pending → validating → processing → completed/failed
- Validation errors reported with row number and field name
- Successful import creates correct records in database
- Upsert mode correctly matches and updates existing records
- Progress tracking updates every 50 rows

---

**Total Tasks**: 35 tasks
**Suggested MVP**: Phase 3 only (T001, T002, T003, T004, T006, T007, T012, T013, T014, T015, T016, T017, T030, T031) - Export tickets only
