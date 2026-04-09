# Tasks: Import/Export Excel Sheets with Queue

**Feature**: 002-import-export-excel | **Date**: 2026-04-09
**Stack**: TypeScript 5.x, Hono 4.x, ORPC 0.4.x, Drizzle ORM 0.45.x, BullMQ, xlsx

---

## Phase 1: Setup

- [x] T001 Add `xlsx` dependency to `packages/queue/package.json`

## Phase 2: Foundational

- [x] T002 Create `packages/db/src/schema/_excel-jobs.ts` with `excelExportJobs` and `excelImportJobs` tables per data-model.md
- [x] T003 Add `_excel-jobs` export to `packages/db/src/schema/index.ts`
- [x] T004 Add excel export queue to `packages/queue/src/queue.ts` with `excel:export` queue name
- [x] T005 Add excel import queue to `packages/queue/src/queue.ts` with `excel:import` queue name

## Phase 3: Excel Export

- [x] T006 Create `packages/queue/src/workers/excel-export.worker.ts` with `ExcelExportJobData` interface
- [x] T007 [P] Implement export query builder for tickets entity in `excel-export.worker.ts`
- [x] T008 [P] Implement export query builder for contacts entity in `excel-export.worker.ts`
- [x] T009 [P] Implement export query builder for users entity in `excel-export.worker.ts`
- [x] T010 [P] Implement export query builder for kb_articles entity in `excel-export.worker.ts`
- [x] T011 [P] Implement export query builder for saved_replies entity in `excel-export.worker.ts`
- [x] T012 Implement Excel file generation using xlsx library in `excel-export.worker.ts`
- [x] T013 Implement S3 presigned URL upload in `excel-export.worker.ts`
- [x] T014 Create `packages/api/src/routers/excel.ts` with ORPC router
- [x] T015 Implement `createExportJob` endpoint in `packages/api/src/routers/excel.ts`
- [x] T016 Implement `getExportJobStatus` endpoint in `packages/api/src/routers/excel.ts`
- [x] T017 Implement `downloadExportFile` endpoint in `packages/api/src/routers/excel.ts`

## Phase 4: Excel Import

- [x] T018 Create `packages/queue/src/workers/excel-import.worker.ts` with `ExcelImportJobData` interface
- [x] T019 Implement file validation (magic bytes, size limit, sheet structure) in `excel-import.worker.ts`
- [x] T020 [P] Implement Excel row parser for tickets in `excel-import.worker.ts`
- [x] T021 [P] Implement Excel row parser for contacts in `excel-import.worker.ts`
- [x] T022 [P] Implement Excel row parser for users in `excel-import.worker.ts`
- [x] T023 [P] Implement Excel row parser for kb_articles in `excel-import.worker.ts`
- [x] T024 [P] Implement Excel row parser for saved_replies in `excel-import.worker.ts`
- [x] T025 Implement batch processing (100-row chunks) with DB transactions in `excel-import.worker.ts`
- [x] T026 Implement upsert logic (match by unique field) in `excel-import.worker.ts`
- [x] T027 Implement error collection with row/field details in `excel-import.worker.ts`
- [x] T028 Implement `createImportJob` endpoint in `packages/api/src/routers/excel.ts`
- [x] T029 Implement `getImportJobStatus` endpoint in `packages/api/src/routers/excel.ts`

## Phase 5: Integration & Polish

- [x] T030 Register excel router in `apps/server/src/index.ts`
- [x] T031 Update `apps/server/src/index.ts` to start excel export worker on server boot
- [x] T032 Update `apps/server/src/index.ts` to start excel import worker on server boot
- [x] T033 Add file size limit validation (50MB max) in import endpoint
- [x] T034 Add max rows validation (50k max) in import endpoint
- [x] T035 Add concurrent export limit (3 per organization) in createExportJob

## Phase 6: Web App UI

- [x] T036 [P] Create Excel management page at `apps/web/src/routes/admin/excel/index.tsx`
- [x] T037 [P] Implement export form with entity type selector in web Excel page
- [x] T038 [P] Implement export history list with status badges and download button in web Excel page
- [x] T039 [P] Implement import form with file upload and mode selector in web Excel page
- [x] T040 [P] Implement import history list with progress indicators in web Excel page
- [x] T041 Add auto-refresh polling (3s interval) for job status updates in web Excel page

## Phase 7: Native App UI

- [x] T042 [P] Create Excel management screen at `apps/native/app/(drawer)/excel/index.tsx`
- [x] T043 [P] Add Excel link to drawer navigation in `apps/native/app/(drawer)/_layout.tsx`
- [x] T044 [P] Implement export UI with entity chips and create button in native Excel screen
- [x] T045 [P] Implement export history list with status chips in native Excel screen
- [x] T046 [P] Implement import UI with entity chips, mode selector, and file URL input in native
- [x] T047 [P] Implement import history list with progress chips in native Excel screen

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
    ↓
Phase 6 (Web UI) ← depends on T030-T035
Phase 7 (Native UI) ← depends on T030-T035
```

## Parallel Opportunities

| Tasks                              | Reason                                            |
| ---------------------------------- | ------------------------------------------------- |
| T007, T008, T009, T010, T011       | Different entity export handlers, no dependencies |
| T020, T021, T022, T023, T024       | Different entity import parsers, no dependencies  |
| T006, T018                         | Export and import workers are independent         |
| T036, T037, T038, T039, T040       | Web UI components, no dependencies on each other  |
| T042, T043, T044, T045, T046, T047 | Native UI components, no dependencies             |

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

### Web UI (T036-T041)

- Export form submits createExportJob mutation successfully
- Export history refreshes and displays job status correctly
- Download button opens export file URL in new tab
- Import form uploads file via generateUploadUrl and creates import job
- Job status auto-refreshes every 3 seconds when jobs are pending/processing

### Native UI (T042-T047)

- Export creates job and shows in history list
- Import form accepts file URL and creates job
- Job status updates via polling
- Navigation drawer shows Excel link

---

**Total Tasks**: 47 tasks (35 backend + 12 frontend)
**Completed**: 47 tasks
**Remaining**: 0 tasks
**Status**: ✅ IMPLEMENTATION COMPLETE
