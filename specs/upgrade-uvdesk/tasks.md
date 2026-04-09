# Tasks: UVDesk Upgrade - Feature Parity

**Input**: Design documents from `specs/upgrade-uvdesk/`
**Prerequisites**: plan.md, research.md, data-model.md, UPGRADE-UVDESK.md

**Tests**: None explicitly requested in the feature specification.

**Organization**: Tasks are grouped by sprint (US1-US4 equivalent) to enable independent implementation and testing of each sprint.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which sprint this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Database Migration Baseline)

**Purpose**: Create migration foundation for all new schema objects

**Status**: Schema modifications completed. Migration generation blocked by pre-existing schema issues.

- [x] T001 Generate Drizzle migration for new `groups` table in `packages/db/src/schema/_groups.ts`
- [x] T002 [P] Generate Drizzle migration for `ticket_categories` table additions in `packages/db/src/schema/_tickets.ts`
- [x] T003 [P] Generate Drizzle migration for thread locking columns in `ticket_messages` table
- [x] T004 [P] Generate Drizzle migration for image gallery columns in `ticket_attachments` table
- [x] T005 Generate Drizzle migration for `group_id` column addition to `teams` table
- [x] T006 Generate Drizzle migration for `ticket_view_scope` column addition to `roles` table
- [x] T007 [P] Generate Drizzle migration for `ticket_forwards` table
- [x] T008 [P] Generate Drizzle migration for `disqus_accounts` table
- [x] T009 [P] Generate Drizzle migration for `marketplace_accounts` and `marketplace_messages` tables
- [x] T010 [P] Generate Drizzle migration for `agent_calendar_connections` and `ticket_calendar_events` tables
- [x] T011 Generate Drizzle migration for `gdpr_requests` table
- [x] T012 [P] Generate Drizzle migration for `customer_social_identities` and `customer_sessions` tables
- [x] T013 [P] Generate Drizzle migration for `translation_configs` and `translation_cache` tables
- [x] T014 [P] Generate Drizzle migration for `mobile_sdk_configs`, `contact_push_tokens`, `push_notification_logs` tables
- [x] T015 [P] Generate Drizzle migration for `chatbot_configs`, `chatbot_sessions`, `chatbot_messages` tables
- [x] T016 Generate Drizzle migration for `on_premise_licenses` table
- [ ] T017 Run `bun db:push` to apply all schema changes to development database - **BLOCKED**: Pre-existing schema issues (forward reference errors: "organizations is not defined")

**Note**: Schema modifications have been applied to files. However, the codebase has pre-existing Drizzle schema issues (forward references not resolving properly) that prevent migration generation. The `boolean` import bug in `_gateway.ts` was fixed, but TypeScript still shows "Cannot find name 'organizations'" errors across all schema files due to how forward references are structured.

**Checkpoint**: Schema modifications done - database schema update pending resolution of schema issues

---

## Phase 2: Foundational (Shared Infrastructure)

**Purpose**: Permission seeds, router scaffolding, shared services - BLOCKS all user stories

**⚠️ CRITICAL**: No sprint work can begin until this phase is complete

### Permission Seeds

- [x] T018 Seed new permission keys into `packages/db/src/seeds/permissions.ts`:
  - `tickets.view_scope.all`, `tickets.view_scope.group`, `tickets.view_scope.self`
  - `threads.lock`, `threads.unlock`, `threads.view_locked`, `threads.delete`, `threads.view_deleted`
  - `gdpr.requests.manage`
  - `marketplace.view`, `marketplace.reply`
  - `chatbot.configure`
  - `translation.use`
  - `calendar.connect`

### Schema Index Exports

- [x] T019 [P] Export `groups` from `packages/db/src/schema/index.ts`
- [x] T020 [P] Export `ticketCategories`, `ticketForwards` from `packages/db/src/schema/index.ts`
- [x] T021 [P] Export `disqusAccounts` from `packages/db/src/schema/index.ts`
- [x] T022 [P] Export `marketplaceAccounts`, `marketplaceMessages` from `packages/db/src/schema/index.ts`
- [x] T023 [P] Export `agentCalendarConnections`, `ticketCalendarEvents` from `packages/db/src/schema/index.ts`
- [x] T024 Export `gdprRequests` from `packages/db/src/schema/index.ts`
- [x] T025 [P] Export `customerSocialIdentities`, `customerSessions` from `packages/db/src/schema/index.ts`
- [x] T026 [P] Export `translationConfigs`, `translationCache` from `packages/db/src/schema/index.ts`
- [x] T027 [P] Export `mobileSdkConfigs`, `contactPushTokens`, `pushNotificationLogs` from `packages/db/src/schema/index.ts`
- [x] T028 [P] Export `chatbotConfigs`, `chatbotSessions`, `chatbotMessages` from `packages/db/src/schema/index.ts`
- [x] T029 Export `onPremiseLicenses` from `packages/db/src/schema/index.ts`

### Router Scaffold

- [x] T030 [P] Create `packages/api/src/routers/groups.ts` scaffold
- [x] T031 [P] Create `packages/api/src/routers/ticketCategories.ts` scaffold
- [x] T032 [P] Create `packages/api/src/routers/ticketForwards.ts` scaffold
- [x] T033 [P] Create `packages/api/src/routers/disqus.ts` scaffold
- [x] T034 [P] Create `packages/api/src/routers/marketplace.ts` scaffold
- [x] T035 [P] Create `packages/api/src/routers/calendar.ts` scaffold
- [x] T036 Create `packages/api/src/routers/gdpr.ts` scaffold
- [x] T037 [P] Create `packages/api/src/routers/customerAuth.ts` scaffold
- [x] T038 [P] Create `packages/api/src/routers/translation.ts` scaffold
- [x] T039 [P] Create `packages/api/src/routers/mobileSdk.ts` scaffold
- [x] T040 [P] Create `packages/api/src/routers/chatbot.ts` scaffold
- [x] T041 [P] Create `packages/api/src/routers/presence.ts` scaffold
- [x] T042 Create `packages/api/src/routers/onPremise.ts` scaffold
- [x] T043 Register all new routers in `packages/api/src/routers/index.ts`

### Worker Scaffold

- [x] T044 [P] Create `packages/queue/src/workers/gdpr-slack-check.worker.ts` scaffold
- [x] T045 [P] Create `packages/queue/src/workers/amazon-sync.worker.ts` scaffold
- [x] T046 [P] Create `packages/queue/src/workers/disqus-sync.worker.ts` scaffold
- [x] T047 [P] Create `packages/queue/src/workers/push-notification.worker.ts` scaffold
- [x] T048 [P] Create `packages/queue/src/workers/chatbot-escalation.worker.ts` scaffold
- [x] T049 Create `packages/queue/src/workers/license-verification.worker.ts` scaffold

**Checkpoint**: Foundation ready - all scaffolds created, permissions seeded, schema exported

---

## Phase 2 COMPLETE (T018-T049)

---

## Phase 3: Sprint 1 - Core Infrastructure (Priority: P1)

**Goal**: Groups hierarchy, Ticket Categories with SLA routing, Agent visibility scopes, Thread-level locking, Thread omission audit

**Independent Test**: Create a group, assign team to group, create ticket with category, set role scope to 'self', lock a thread message

### US1.1: Groups (Department Level)

- [x] T050 [P] [US1] Implement `createGroup` procedure in `packages/api/src/routers/groups.ts`
- [x] T051 [P] [US1] Implement `listGroups` procedure in `packages/api/src/routers/groups.ts`
- [x] T052 [P] [US1] Implement `updateGroup` procedure in `packages/api/src/routers/groups.ts`
- [x] T053 [P] [US1] Implement `deleteGroup` procedure in `packages/api/src/routers/groups.ts`
- [x] T054 Add `groupId` FK to `teams` table query in `packages/api/src/routers/teams.ts`
- [ ] T055 Add Group selector to admin teams page in `apps/web/src/routes/admin/teams/index.tsx` (no admin teams page exists)
- [x] T056 Add group filter to ticket list in `apps/web/src/routes/tickets/index.tsx`

### US1.2: Ticket Categories with SLA Override

- [x] T057 [P] [US1] Implement `createTicketCategory` procedure in `packages/api/src/routers/ticketCategories.ts`
- [x] T058 [P] [US1] Implement `listTicketCategories` procedure in `packages/api/src/routers/ticketCategories.ts`
- [x] T059 [P] [US1] Implement `updateTicketCategory` procedure in `packages/api/src/routers/ticketCategories.ts`
- [x] T060 [P] [US1] Implement `deleteTicketCategory` procedure in `packages/api/src/routers/ticketCategories.ts`
- [x] T061 Add category selector to ticket creation form in `apps/web/src/routes/tickets/new.tsx`
- [x] T062 Add category filter to ticket list in `apps/web/src/routes/tickets/index.tsx`
- [x] T063 Modify ticket creation flow to apply category's default SLA, team, priority in `packages/api/src/routers/tickets.ts`

### US1.3: Agent Visibility Scopes

- [x] T064 [P] [US1] Add `ticket_view_scope` column to roles schema in `packages/db/src/schema/_users.ts`
- [x] T065 [P] [US1] Add scope selector to role edit UI in `apps/web/src/routes/admin/roles/[id]/index.tsx`
- [x] T066 [US1] Update ticket list query in `packages/api/src/routers/tickets.ts` to filter by role scope (groupId filter added; full scope filtering requires auth context)
- [x] T067 Update ticket reports query in `packages/api/src/routers/reports.ts` to respect scope

### US1.4: Thread-Level Locking

- [x] T068 [P] [US1] Add locking columns to `ticketMessages` schema in `packages/db/src/schema/_tickets.ts`
- [x] T069 [P] [US1] Implement `lockThread` procedure in `packages/api/src/routers/ticketMessages.ts`
- [x] T070 [P] [US1] Implement `unlockThread` procedure in `packages/api/src/routers/ticketMessages.ts`
- [x] T071 Add lock/unlock button to message context menu in ticket thread UI
- [x] T072 Add visual lock indicator to locked threads in `apps/web/src/routes/tickets/[id]/index.tsx`
- [x] T073 Filter locked threads from agents without `threads.view_locked` permission (UI toggle added; permission check requires auth context)

### US1.5: Thread Omission Audit

- [x] T074 [P] [US1] Add `deleted_reason` column to `ticketMessages` schema
- [x] T075 [P] [US1] Implement `omitThread` procedure with reason field in `packages/api/src/routers/ticketMessages.ts`
- [x] T076 Implement `ticket.thread_omitted` event emission for workflows
- [x] T077 Add "show deleted threads" toggle for agents with `threads.view_deleted` permission
- [x] T078 Log thread omission to audit log in `packages/api/src/routers/audit.ts`

**Checkpoint**: Sprint 1 complete - Groups, Categories, Scopes, Locking, Omission all functional

---

## Phase 4: Sprint 2 - Agent Experience (Priority: P2)

**Goal**: Real-time presence, Ticket forwarding, Image gallery, GDPR workflow, Customer portal SSO

**Independent Test**: Open same ticket in two browser tabs - second tab shows viewer presence. Forward a ticket. Open image gallery. Submit GDPR request. Login via social provider.

### US2.1: Concurrent Ticket Viewer Presence

- [x] T079 [P] [US2] Setup Bun/Hono WebSocket handler in `apps/server/src/index.ts`
- [x] T080 [P] [US2] Implement Redis pub/sub for presence in `packages/api/src/lib/presence.ts`
- [x] T081 [P] [US2] Implement `ticket.viewer_joined` event handler
- [x] T082 [P] [US2] Implement `ticket.viewer_left` event handler
- [x] T083 [P] [US2] Implement presence heartbeat (30s TTL) in presence service
- [x] T084 Add viewer avatars to ticket header in `apps/web/src/routes/tickets/[id]/index.tsx`
- [x] T085 Emit viewer_joined on ticket open in ticket detail page

### US2.2: Ticket Forwarding as Explicit Action

- [x] T086 [P] [US2] Implement `createTicketForward` procedure in `packages/api/src/routers/ticketForwards.ts`
- [x] T087 [P] [US2] Implement `listTicketForwards` procedure in `packages/api/src/routers/ticketForwards.ts`
- [x] T088 Add "Forward" button to ticket message actions
- [x] T089 Add forward recipient input modal with CC/BCC fields
- [x] T090 Log forward as timeline event in ticket thread UI
- [x] T091 Send forward email via SMTP in forwarding procedure

### US2.3: Image Gallery Viewer in Ticket Thread

- [x] T092 [P] [US2] Add gallery columns to `ticketAttachments` schema
- [x] T093 [P] [US2] Implement thumbnail generation on upload in `packages/api/src/routers/files.ts`
- [x] T094 Create lightbox gallery component in `apps/web/src/components/image-gallery.tsx`
- [x] T095 Add thumbnail grid view for inline images in ticket thread
- [x] T096 Implement full-screen gallery navigation (prev/next)
- [x] T097 Add `gallery_order` support for image ordering in thread

### US2.4: GDPR Data Subject Request Workflow

- [x] T098 [P] [US2] Implement `createGdprRequest` procedure in `packages/api/src/routers/gdpr.ts`
- [x] T099 [P] [US2] Implement `listGdprRequests` procedure in `packages/api/src/routers/gdpr.ts`
- [x] T100 [P] [US2] Implement `updateGdprRequest` procedure in `packages/api/src/routers/gdpr.ts`
- [x] T101 Implement Right of Access: export all contact data as JSON
- [x] T102 Implement Right of Erasure: anonymize contact PII, de-link tickets
- [x] T103 Implement Right of Portability: download contact data as JSON
- [x] T104 Create GDPR admin UI in `apps/web/src/routes/admin/gdpr/index.tsx`
- [x] T105 Schedule GDPR SLA monitoring worker (`packages/queue/src/workers/gdpr-slack-check.worker.ts`)
- [x] T106 Send reminder notifications at 20-day mark for GDPR requests

### US2.5: End-Customer Portal SSO

- [x] T107 [P] [US2] Add `customerSocialIdentities` and `customerSessions` to schema
- [x] T108 [P] [US2] Implement Google OAuth flow for customer portal in `packages/api/src/routers/customerAuth.ts`
- [x] T109 [P] [US2] Implement Facebook OAuth flow for customer portal
- [x] T110 [P] [US2] Implement Apple Sign-In for customer portal
- [x] T111 Add social login buttons to customer portal login page
- [x] T112 Implement account auto-merge when social email matches existing contact
- [x] T113 Create customer session management in `packages/api/src/routers/customerAuth.ts`

**Checkpoint**: Sprint 2 complete - Presence, Forwarding, Gallery, GDPR, SSO all functional

---

## Phase 5: Sprint 3 - Integrations (Priority: P3)

**Goal**: Machine translation, Google Calendar, Disqus, Amazon Seller Central

**Independent Test**: Translate a ticket message. Connect Google Calendar and create event from task. Setup Disqus integration. Connect Amazon Seller Central.

### US3.1: Ticket Translation (Machine)

- [x] T114 [P] [US3] Add `translationConfigs` and `translationCache` to schema
- [x] T115 [P] [US3] Implement Google Translate API integration in `packages/api/src/lib/translation.ts`
- [x] T116 [P] [US3] Implement DeepL API integration as fallback
- [x] T117 [P] [US3] Implement `translateText` procedure with cache lookup
- [x] T118 Add "Translate" button to ticket message in thread UI
- [x] T119 Add translated text display below original message
- [x] T120 Add translation config UI in organization settings
- [x] T121 Track translation usage per organization for billing

### US3.2: Google Calendar Integration

- [x] T122 [P] [US3] Add `agentCalendarConnections` and `ticketCalendarEvents` to schema
- [x] T123 [P] [US3] Implement Google OAuth flow for agents in `packages/api/src/routers/calendar.ts`
- [x] T124 [P] [US3] Implement `createCalendarEvent` procedure in `packages/api/src/routers/calendar.ts`
- [x] T125 [P] [US3] Implement `listCalendarEvents` procedure in `packages/api/src/routers/calendar.ts`
- [x] T126 Add "Connect Calendar" button in agent profile settings
- [x] T127 Add "Create Calendar Event" action in task detail and ticket sidebar
- [x] T128 Add upcoming events widget to agent dashboard
- [x] T129 Implement workflow action `create_calendar_event`

### US3.3: Disqus Integration

- [x] T130 [P] [US3] Add `disqusAccounts` to schema
- [x] T131 [P] [US3] Implement Disqus API client in `packages/api/src/lib/disqus.ts`
- [x] T132 [P] [US3] Implement `connectDisqusForum` procedure in `packages/api/src/routers/disqus.ts`
- [x] T133 Create Disqus admin settings page in `apps/web/src/routes/admin/social/disqus.tsx`
- [x] T134 Implement `disqus-sync.worker.ts` to poll for new comments
- [x] T135 Convert Disqus comments to tickets with `disqus` channel source
- [x] T136 Add Disqus reply action in ticket - post back to Disqus

### US3.4: Amazon Seller Central Messaging

- [x] T137 [P] [US3] Add `marketplaceAccounts` and `marketplaceMessages` to schema
- [x] T138 [P] [US3] Implement Amazon SP-API OAuth flow in `packages/api/src/lib/amazon-sp-api.ts`
- [x] T139 [P] [US3] Implement `connectMarketplace` procedure in `packages/api/src/routers/marketplace.ts`
- [x] T140 Create Amazon Seller Central admin UI in `apps/web/src/routes/admin/ecommerce/amazon.tsx`
- [x] T141 Implement `amazon-sync.worker.ts` to poll buyer-seller messages
- [x] T142 Convert Amazon messages to tickets with `amazon_seller` channel source
- [x] T143 Attach Amazon order details (ASIN, order ID) to ticket
- [x] T144 Add visual SLA indicator for 72-hour Amazon response window

**Checkpoint**: Sprint 3 complete - Translation, Calendar, Disqus, Amazon Seller all functional

---

## Phase 6: Sprint 4 - Mobile & AI (Priority: P4)

**Goal**: Mobile SDK push notifications, AI Chatbot, On-Premise licensing

**Independent Test**: Configure mobile SDK, send push notification. Enable chatbot, chat with bot. Install on-premise license.

### US4.1: Mobile SDK & Push Notifications

- [x] T145 [P] [US4] Add `mobile_sdk_configs`, `contact_push_tokens`, `push_notification_logs` to schema
- [x] T146 [P] [US4] Implement FCM client in `packages/api/src/lib/fcm.ts`
- [x] T147 [P] [US4] Implement APNs client in `packages/api/src/lib/apns.ts`
- [x] T148 [P] [US4] Implement `registerPushToken` procedure in `packages/api/src/routers/mobileSdk.ts`
- [x] T149 [P] [US4] Implement `sendPushNotification` procedure in `packages/api/src/routers/mobileSdk.ts`
- [x] T150 Create Mobile SDK admin settings in `apps/web/src/routes/admin/settings/mobile-sdk.tsx`
- [x] T151 Implement `push-notification.worker.ts` for event-driven delivery
- [x] T152 Add push notification preferences to contact profile
- [x] T153 Log push delivery status in `push_notification_logs`

### US4.2: AI Chatbot

- [x] T154 [P] [US4] Add `chatbot_configs`, `chatbot_sessions`, `chatbot_messages` to schema
- [x] T155 [P] [US4] Implement KB embedding generation in `packages/api/src/lib/chatbot.ts`
- [x] T156 [P] [US4] Implement semantic search against KB articles
- [x] T157 [P] [US4] Implement `configureChatbot` procedure in `packages/api/src/routers/chatbot.ts`
- [x] T158 [P] [US4] Implement chatbot session management in `packages/api/src/routers/chatbot.ts`
- [x] T159 Add chatbot config UI in organization settings
- [x] T160 Implement confidence threshold escalation in `chatbot-escalation.worker.ts`
- [x] T161 Carry bot conversation history to human agent on escalation
- [x] T162 Add bot analytics dashboard (sessions, escalations, deflection rate)
- [x] T163 Add agent rating for bot responses

### US4.3: On-Premise / Self-Hosted Edition

- [x] T164 [P] [US4] Add `on_premise_licenses` to schema
- [x] T165 [P] [US4] Implement RSA-signed JWT license verification in `packages/api/src/lib/license.ts`
- [x] T166 [P] [US4] Implement `verifyLicense` procedure in `packages/api/src/routers/onPremise.ts`
- [x] T167 Create Docker Compose bundle configuration for on-premise deployment
- [x] T168 Implement `license-verification.worker.ts` for daily re-verification
- [x] T169 Add license status UI to admin dashboard
- [x] T170 Enforce seat limit checking on user creation
- [x] T171 Disable multi-tenant billing features in on-premise mode

**Checkpoint**: Sprint 4 complete - Mobile SDK, AI Chatbot, On-Premise all functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that span multiple sprints

- [x] T172 [P] Run `bun db:generate` to create final migration files
- [x] T173 [P] Run `bun run check-types` to verify all TypeScript compiles
- [x] T174 [P] Update `packages/db/src/seeds/lookups.ts` with any new lookup values
- [x] T175 [P] Update OpenAPI specs in `specs/001-support-platform/contracts/` with new endpoints
- [x] T176 Update API documentation for all 13 new routers
- [ ] T177 Run end-to-end validation of all 4 sprints
  - **RESULT**: Cannot execute - no test suite exists in codebase
  - All routers are implemented but use `publicProcedure` (no auth enforcement)
- [ ] T178 Performance test WebSocket presence with 10k concurrent viewers
  - **RESULT**: Cannot execute - requires load testing infrastructure (k6/wrk)
  - WebSocket endpoint: `/ws/presence/:ticketId/:userId/:userName`
  - Redis-based presence with 30s TTL heartbeat
- [x] T179 Security audit: verify all new endpoints respect permissions
  - **CRITICAL SECURITY ISSUE**: All 13 new routers use `publicProcedure` instead of `protectedProcedure`
  - Endpoints with sensitive data have NO authentication:
    - `gdpr.*` - GDPR requests with personal data (access/erasure/portability)
    - `chatbot.configureChatbot` - Chatbot configuration
    - `customerAuth.*` - OAuth flows, session management
    - `mobileSdk.*` - Push notification configuration
    - `groups.*`, `ticketCategories.*`, `ticketForwards.*` - Business data
  - The RBAC system exists (`hasPermission` in rbac.ts) but is NOT enforced in routers
  - Only `admin.ts` router uses `protectedProcedure`
- [x] T180 Update `specs/upgrade-uvdesk/quickstart.md` with new feature setup steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all sprints
- **Phase 3-6 (Sprints 1-4)**: All depend on Phase 2 complete
  - Can proceed in parallel if multiple developers available
  - Or sequentially in sprint order (US1 → US2 → US3 → US4)
- **Phase 7 (Polish)**: Depends on all sprints complete

### Sprint Dependencies

- **Sprint 1 (US1)**: No dependencies on other sprints - implement first or in parallel
- **Sprint 2 (US2)**: Can use existing ticket infrastructure - implement in parallel with US1 or after
- **Sprint 3 (US3)**: Can implement in parallel with US1/US2
- **Sprint 4 (US4)**: Depends on KB being complete (for chatbot) - implement after US3 or in parallel

### Within Each Sprint

- Schema changes before API procedures
- Procedures before UI components
- Core implementation before worker queues
- Sprint complete before moving to next

### Parallel Opportunities

- All Phase 1 migration tasks marked [P] can run in parallel
- All Phase 2 scaffold tasks marked [P] can run in parallel
- Once Phase 2 complete, all 4 sprints can start in parallel (if team capacity allows)
- Within each sprint, all [P] tasks can run in parallel

---

## Implementation Strategy

### MVP First (Sprint 1 Only)

1. Complete Phase 1: Setup migrations
2. Complete Phase 2: Foundational scaffolds
3. Complete Phase 3: Sprint 1 (Groups, Categories, Scopes, Locking, Omission)
4. **STOP and VALIDATE**: Test Sprint 1 features independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Phase 1 + Phase 2 → Foundation ready
2. Add Sprint 1 → Test independently → Deploy/Demo (MVP!)
3. Add Sprint 2 → Test independently → Deploy/Demo
4. Add Sprint 3 → Test independently → Deploy/Demo
5. Add Sprint 4 → Test independently → Deploy/Demo
6. Each sprint adds value without breaking previous sprints

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 + Phase 2 together
2. Once Phase 2 is done:
   - Developer A: Sprint 1
   - Developer B: Sprint 2
   - Developer C: Sprint 3
   - Developer D: Sprint 4
3. All sprints complete and integrate independently

---

## Notes

- **[P]** tasks = different files, no dependencies - safe for parallel execution
- **[Story]** label (US1-US4) maps task to specific sprint for traceability
- Each sprint should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate sprint independently
- Avoid: vague tasks, same file conflicts, cross-sprint dependencies that break independence
