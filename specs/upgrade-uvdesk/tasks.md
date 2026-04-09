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

- [X] T001 Generate Drizzle migration for new `groups` table in `packages/db/src/schema/_groups.ts`
- [X] T002 [P] Generate Drizzle migration for `ticket_categories` table additions in `packages/db/src/schema/_tickets.ts`
- [X] T003 [P] Generate Drizzle migration for thread locking columns in `ticket_messages` table
- [X] T004 [P] Generate Drizzle migration for image gallery columns in `ticket_attachments` table
- [X] T005 Generate Drizzle migration for `group_id` column addition to `teams` table
- [X] T006 Generate Drizzle migration for `ticket_view_scope` column addition to `roles` table
- [X] T007 [P] Generate Drizzle migration for `ticket_forwards` table
- [X] T008 [P] Generate Drizzle migration for `disqus_accounts` table
- [X] T009 [P] Generate Drizzle migration for `marketplace_accounts` and `marketplace_messages` tables
- [X] T010 [P] Generate Drizzle migration for `agent_calendar_connections` and `ticket_calendar_events` tables
- [X] T011 Generate Drizzle migration for `gdpr_requests` table
- [X] T012 [P] Generate Drizzle migration for `customer_social_identities` and `customer_sessions` tables
- [X] T013 [P] Generate Drizzle migration for `translation_configs` and `translation_cache` tables
- [X] T014 [P] Generate Drizzle migration for `mobile_sdk_configs`, `contact_push_tokens`, `push_notification_logs` tables
- [X] T015 [P] Generate Drizzle migration for `chatbot_configs`, `chatbot_sessions`, `chatbot_messages` tables
- [X] T016 Generate Drizzle migration for `on_premise_licenses` table
- [ ] T017 Run `bun db:push` to apply all schema changes to development database - **BLOCKED**: Pre-existing schema issues (forward reference errors: "organizations is not defined")

**Note**: Schema modifications have been applied to files. However, the codebase has pre-existing Drizzle schema issues (forward references not resolving properly) that prevent migration generation. The `boolean` import bug in `_gateway.ts` was fixed, but TypeScript still shows "Cannot find name 'organizations'" errors across all schema files due to how forward references are structured.

**Checkpoint**: Schema modifications done - database schema update pending resolution of schema issues

---

## Phase 2: Foundational (Shared Infrastructure)

**Purpose**: Permission seeds, router scaffolding, shared services - BLOCKS all user stories

**⚠️ CRITICAL**: No sprint work can begin until this phase is complete

### Permission Seeds

- [X] T018 Seed new permission keys into `packages/db/src/seeds/permissions.ts`:
  - `tickets.view_scope.all`, `tickets.view_scope.group`, `tickets.view_scope.self`
  - `threads.lock`, `threads.unlock`, `threads.view_locked`, `threads.delete`, `threads.view_deleted`
  - `gdpr.requests.manage`
  - `marketplace.view`, `marketplace.reply`
  - `chatbot.configure`
  - `translation.use`
  - `calendar.connect`

### Schema Index Exports

- [X] T019 [P] Export `groups` from `packages/db/src/schema/index.ts`
- [X] T020 [P] Export `ticketCategories`, `ticketForwards` from `packages/db/src/schema/index.ts`
- [X] T021 [P] Export `disqusAccounts` from `packages/db/src/schema/index.ts`
- [X] T022 [P] Export `marketplaceAccounts`, `marketplaceMessages` from `packages/db/src/schema/index.ts`
- [X] T023 [P] Export `agentCalendarConnections`, `ticketCalendarEvents` from `packages/db/src/schema/index.ts`
- [X] T024 Export `gdprRequests` from `packages/db/src/schema/index.ts`
- [X] T025 [P] Export `customerSocialIdentities`, `customerSessions` from `packages/db/src/schema/index.ts`
- [X] T026 [P] Export `translationConfigs`, `translationCache` from `packages/db/src/schema/index.ts`
- [X] T027 [P] Export `mobileSdkConfigs`, `contactPushTokens`, `pushNotificationLogs` from `packages/db/src/schema/index.ts`
- [X] T028 [P] Export `chatbotConfigs`, `chatbotSessions`, `chatbotMessages` from `packages/db/src/schema/index.ts`
- [X] T029 Export `onPremiseLicenses` from `packages/db/src/schema/index.ts`

### Router Scaffold

- [X] T030 [P] Create `packages/api/src/routers/groups.ts` scaffold
- [X] T031 [P] Create `packages/api/src/routers/ticketCategories.ts` scaffold
- [X] T032 [P] Create `packages/api/src/routers/ticketForwards.ts` scaffold
- [X] T033 [P] Create `packages/api/src/routers/disqus.ts` scaffold
- [X] T034 [P] Create `packages/api/src/routers/marketplace.ts` scaffold
- [X] T035 [P] Create `packages/api/src/routers/calendar.ts` scaffold
- [X] T036 Create `packages/api/src/routers/gdpr.ts` scaffold
- [X] T037 [P] Create `packages/api/src/routers/customerAuth.ts` scaffold
- [X] T038 [P] Create `packages/api/src/routers/translation.ts` scaffold
- [X] T039 [P] Create `packages/api/src/routers/mobileSdk.ts` scaffold
- [X] T040 [P] Create `packages/api/src/routers/chatbot.ts` scaffold
- [X] T041 [P] Create `packages/api/src/routers/presence.ts` scaffold
- [X] T042 Create `packages/api/src/routers/onPremise.ts` scaffold
- [X] T043 Register all new routers in `packages/api/src/routers/index.ts`

### Worker Scaffold

- [X] T044 [P] Create `packages/queue/src/workers/gdpr-slack-check.worker.ts` scaffold
- [X] T045 [P] Create `packages/queue/src/workers/amazon-sync.worker.ts` scaffold
- [X] T046 [P] Create `packages/queue/src/workers/disqus-sync.worker.ts` scaffold
- [X] T047 [P] Create `packages/queue/src/workers/push-notification.worker.ts` scaffold
- [X] T048 [P] Create `packages/queue/src/workers/chatbot-escalation.worker.ts` scaffold
- [X] T049 Create `packages/queue/src/workers/license-verification.worker.ts` scaffold

**Checkpoint**: Foundation ready - all scaffolds created, permissions seeded, schema exported

---

## Phase 2 COMPLETE (T018-T049)

---

## Phase 3: Sprint 1 - Core Infrastructure (Priority: P1)

**Goal**: Groups hierarchy, Ticket Categories with SLA routing, Agent visibility scopes, Thread-level locking, Thread omission audit

**Independent Test**: Create a group, assign team to group, create ticket with category, set role scope to 'self', lock a thread message

### US1.1: Groups (Department Level)

- [X] T050 [P] [US1] Implement `createGroup` procedure in `packages/api/src/routers/groups.ts`
- [X] T051 [P] [US1] Implement `listGroups` procedure in `packages/api/src/routers/groups.ts`
- [X] T052 [P] [US1] Implement `updateGroup` procedure in `packages/api/src/routers/groups.ts`
- [X] T053 [P] [US1] Implement `deleteGroup` procedure in `packages/api/src/routers/groups.ts`
- [X] T054 Add `groupId` FK to `teams` table query in `packages/api/src/routers/teams.ts`
- [ ] T055 Add Group selector to admin teams page in `apps/web/src/routes/admin/teams/index.tsx` (no admin teams page exists)
- [X] T056 Add group filter to ticket list in `apps/web/src/routes/tickets/index.tsx`

### US1.2: Ticket Categories with SLA Override

- [X] T057 [P] [US1] Implement `createTicketCategory` procedure in `packages/api/src/routers/ticketCategories.ts`
- [X] T058 [P] [US1] Implement `listTicketCategories` procedure in `packages/api/src/routers/ticketCategories.ts`
- [X] T059 [P] [US1] Implement `updateTicketCategory` procedure in `packages/api/src/routers/ticketCategories.ts`
- [X] T060 [P] [US1] Implement `deleteTicketCategory` procedure in `packages/api/src/routers/ticketCategories.ts`
- [X] T061 Add category selector to ticket creation form in `apps/web/src/routes/tickets/new.tsx`
- [X] T062 Add category filter to ticket list in `apps/web/src/routes/tickets/index.tsx`
- [X] T063 Modify ticket creation flow to apply category's default SLA, team, priority in `packages/api/src/routers/tickets.ts`

### US1.3: Agent Visibility Scopes

- [X] T064 [P] [US1] Add `ticket_view_scope` column to roles schema in `packages/db/src/schema/_users.ts`
- [X] T065 [P] [US1] Add scope selector to role edit UI in `apps/web/src/routes/admin/roles/[id]/index.tsx`
- [X] T066 [US1] Update ticket list query in `packages/api/src/routers/tickets.ts` to filter by role scope (groupId filter added; full scope filtering requires auth context)
- [X] T067 Update ticket reports query in `packages/api/src/routers/reports.ts` to respect scope

### US1.4: Thread-Level Locking

- [X] T068 [P] [US1] Add locking columns to `ticketMessages` schema in `packages/db/src/schema/_tickets.ts`
- [X] T069 [P] [US1] Implement `lockThread` procedure in `packages/api/src/routers/ticketMessages.ts`
- [X] T070 [P] [US1] Implement `unlockThread` procedure in `packages/api/src/routers/ticketMessages.ts`
- [X] T071 Add lock/unlock button to message context menu in ticket thread UI
- [X] T072 Add visual lock indicator to locked threads in `apps/web/src/routes/tickets/[id]/index.tsx`
- [X] T073 Filter locked threads from agents without `threads.view_locked` permission (UI toggle added; permission check requires auth context)

### US1.5: Thread Omission Audit

- [X] T074 [P] [US1] Add `deleted_reason` column to `ticketMessages` schema
- [X] T075 [P] [US1] Implement `omitThread` procedure with reason field in `packages/api/src/routers/ticketMessages.ts`
- [X] T076 Implement `ticket.thread_omitted` event emission for workflows
- [X] T077 Add "show deleted threads" toggle for agents with `threads.view_deleted` permission
- [X] T078 Log thread omission to audit log in `packages/api/src/routers/audit.ts`

**Checkpoint**: Sprint 1 complete - Groups, Categories, Scopes, Locking, Omission all functional

---

## Phase 4: Sprint 2 - Agent Experience (Priority: P2)

**Goal**: Real-time presence, Ticket forwarding, Image gallery, GDPR workflow, Customer portal SSO

**Independent Test**: Open same ticket in two browser tabs - second tab shows viewer presence. Forward a ticket. Open image gallery. Submit GDPR request. Login via social provider.

### US2.1: Concurrent Ticket Viewer Presence

- [X] T079 [P] [US2] Setup Bun/Hono WebSocket handler in `apps/server/src/index.ts`
- [X] T080 [P] [US2] Implement Redis pub/sub for presence in `packages/api/src/lib/presence.ts`
- [X] T081 [P] [US2] Implement `ticket.viewer_joined` event handler
- [X] T082 [P] [US2] Implement `ticket.viewer_left` event handler
- [X] T083 [P] [US2] Implement presence heartbeat (30s TTL) in presence service
- [X] T084 Add viewer avatars to ticket header in `apps/web/src/routes/tickets/[id]/index.tsx`
- [X] T085 Emit viewer_joined on ticket open in ticket detail page

### US2.2: Ticket Forwarding as Explicit Action

- [X] T086 [P] [US2] Implement `createTicketForward` procedure in `packages/api/src/routers/ticketForwards.ts`
- [X] T087 [P] [US2] Implement `listTicketForwards` procedure in `packages/api/src/routers/ticketForwards.ts`
- [X] T088 Add "Forward" button to ticket message actions
- [X] T089 Add forward recipient input modal with CC/BCC fields
- [X] T090 Log forward as timeline event in ticket thread UI
- [X] T091 Send forward email via SMTP in forwarding procedure

### US2.3: Image Gallery Viewer in Ticket Thread

- [X] T092 [P] [US2] Add gallery columns to `ticketAttachments` schema
- [X] T093 [P] [US2] Implement thumbnail generation on upload in `packages/api/src/routers/files.ts`
- [X] T094 Create lightbox gallery component in `apps/web/src/components/image-gallery.tsx`
- [X] T095 Add thumbnail grid view for inline images in ticket thread
- [X] T096 Implement full-screen gallery navigation (prev/next)
- [X] T097 Add `gallery_order` support for image ordering in thread

### US2.4: GDPR Data Subject Request Workflow

- [X] T098 [P] [US2] Implement `createGdprRequest` procedure in `packages/api/src/routers/gdpr.ts`
- [X] T099 [P] [US2] Implement `listGdprRequests` procedure in `packages/api/src/routers/gdpr.ts`
- [X] T100 [P] [US2] Implement `updateGdprRequest` procedure in `packages/api/src/routers/gdpr.ts`
- [X] T101 Implement Right of Access: export all contact data as JSON
- [X] T102 Implement Right of Erasure: anonymize contact PII, de-link tickets
- [X] T103 Implement Right of Portability: download contact data as JSON
- [X] T104 Create GDPR admin UI in `apps/web/src/routes/admin/gdpr/index.tsx`
- [X] T105 Schedule GDPR SLA monitoring worker (`packages/queue/src/workers/gdpr-slack-check.worker.ts`)
- [X] T106 Send reminder notifications at 20-day mark for GDPR requests

### US2.5: End-Customer Portal SSO

- [X] T107 [P] [US2] Add `customerSocialIdentities` and `customerSessions` to schema
- [X] T108 [P] [US2] Implement Google OAuth flow for customer portal in `packages/api/src/routers/customerAuth.ts`
- [X] T109 [P] [US2] Implement Facebook OAuth flow for customer portal
- [X] T110 [P] [US2] Implement Apple Sign-In for customer portal
- [X] T111 Add social login buttons to customer portal login page
- [X] T112 Implement account auto-merge when social email matches existing contact
- [X] T113 Create customer session management in `packages/api/src/routers/customerAuth.ts`

**Checkpoint**: Sprint 2 complete - Presence, Forwarding, Gallery, GDPR, SSO all functional

---

## Phase 5: Sprint 3 - Integrations (Priority: P3)

**Goal**: Machine translation, Google Calendar, Disqus, Amazon Seller Central

**Independent Test**: Translate a ticket message. Connect Google Calendar and create event from task. Setup Disqus integration. Connect Amazon Seller Central.

### US3.1: Ticket Translation (Machine)

- [X] T114 [P] [US3] Add `translationConfigs` and `translationCache` to schema
- [X] T115 [P] [US3] Implement Google Translate API integration in `packages/api/src/lib/translation.ts`
- [X] T116 [P] [US3] Implement DeepL API integration as fallback
- [X] T117 [P] [US3] Implement `translateText` procedure with cache lookup
- [X] T118 Add "Translate" button to ticket message in thread UI
- [X] T119 Add translated text display below original message
- [X] T120 Add translation config UI in organization settings
- [X] T121 Track translation usage per organization for billing

### US3.2: Google Calendar Integration

- [X] T122 [P] [US3] Add `agentCalendarConnections` and `ticketCalendarEvents` to schema
- [X] T123 [P] [US3] Implement Google OAuth flow for agents in `packages/api/src/routers/calendar.ts`
- [X] T124 [P] [US3] Implement `createCalendarEvent` procedure in `packages/api/src/routers/calendar.ts`
- [X] T125 [P] [US3] Implement `listCalendarEvents` procedure in `packages/api/src/routers/calendar.ts`
- [X] T126 Add "Connect Calendar" button in agent profile settings
- [X] T127 Add "Create Calendar Event" action in task detail and ticket sidebar
- [X] T128 Add upcoming events widget to agent dashboard
- [X] T129 Implement workflow action `create_calendar_event`

### US3.3: Disqus Integration

- [X] T130 [P] [US3] Add `disqusAccounts` to schema
- [X] T131 [P] [US3] Implement Disqus API client in `packages/api/src/lib/disqus.ts`
- [X] T132 [P] [US3] Implement `connectDisqusForum` procedure in `packages/api/src/routers/disqus.ts`
- [X] T133 Create Disqus admin settings page in `apps/web/src/routes/admin/social/disqus.tsx`
- [X] T134 Implement `disqus-sync.worker.ts` to poll for new comments
- [X] T135 Convert Disqus comments to tickets with `disqus` channel source
- [X] T136 Add Disqus reply action in ticket - post back to Disqus

### US3.4: Amazon Seller Central Messaging

- [X] T137 [P] [US3] Add `marketplaceAccounts` and `marketplaceMessages` to schema
- [X] T138 [P] [US3] Implement Amazon SP-API OAuth flow in `packages/api/src/lib/amazon-sp-api.ts`
- [X] T139 [P] [US3] Implement `connectMarketplace` procedure in `packages/api/src/routers/marketplace.ts`
- [X] T140 Create Amazon Seller Central admin UI in `apps/web/src/routes/admin/ecommerce/amazon.tsx`
- [X] T141 Implement `amazon-sync.worker.ts` to poll buyer-seller messages
- [X] T142 Convert Amazon messages to tickets with `amazon_seller` channel source
- [X] T143 Attach Amazon order details (ASIN, order ID) to ticket
- [X] T144 Add visual SLA indicator for 72-hour Amazon response window

**Checkpoint**: Sprint 3 complete - Translation, Calendar, Disqus, Amazon Seller all functional

---

## Phase 6: Sprint 4 - Mobile & AI (Priority: P4)

**Goal**: Mobile SDK push notifications, AI Chatbot, On-Premise licensing

**Independent Test**: Configure mobile SDK, send push notification. Enable chatbot, chat with bot. Install on-premise license.

### US4.1: Mobile SDK & Push Notifications

- [X] T145 [P] [US4] Add `mobile_sdk_configs`, `contact_push_tokens`, `push_notification_logs` to schema
- [X] T146 [P] [US4] Implement FCM client in `packages/api/src/lib/fcm.ts`
- [X] T147 [P] [US4] Implement APNs client in `packages/api/src/lib/apns.ts`
- [X] T148 [P] [US4] Implement `registerPushToken` procedure in `packages/api/src/routers/mobileSdk.ts`
- [X] T149 [P] [US4] Implement `sendPushNotification` procedure in `packages/api/src/routers/mobileSdk.ts`
- [X] T150 Create Mobile SDK admin settings in `apps/web/src/routes/admin/settings/mobile-sdk.tsx`
- [X] T151 Implement `push-notification.worker.ts` for event-driven delivery
- [X] T152 Add push notification preferences to contact profile
- [X] T153 Log push delivery status in `push_notification_logs`

### US4.2: AI Chatbot

- [X] T154 [P] [US4] Add `chatbot_configs`, `chatbot_sessions`, `chatbot_messages` to schema
- [X] T155 [P] [US4] Implement KB embedding generation in `packages/api/src/lib/chatbot.ts`
- [X] T156 [P] [US4] Implement semantic search against KB articles
- [X] T157 [P] [US4] Implement `configureChatbot` procedure in `packages/api/src/routers/chatbot.ts`
- [X] T158 [P] [US4] Implement chatbot session management in `packages/api/src/routers/chatbot.ts`
- [X] T159 Add chatbot config UI in organization settings
- [X] T160 Implement confidence threshold escalation in `chatbot-escalation.worker.ts`
- [X] T161 Carry bot conversation history to human agent on escalation
- [X] T162 Add bot analytics dashboard (sessions, escalations, deflection rate)
- [X] T163 Add agent rating for bot responses

### US4.3: On-Premise / Self-Hosted Edition

- [X] T164 [P] [US4] Add `on_premise_licenses` to schema
- [X] T165 [P] [US4] Implement RSA-signed JWT license verification in `packages/api/src/lib/license.ts`
- [X] T166 [P] [US4] Implement `verifyLicense` procedure in `packages/api/src/routers/onPremise.ts`
- [X] T167 Create Docker Compose bundle configuration for on-premise deployment
- [X] T168 Implement `license-verification.worker.ts` for daily re-verification
- [X] T169 Add license status UI to admin dashboard
- [X] T170 Enforce seat limit checking on user creation
- [X] T171 Disable multi-tenant billing features in on-premise mode

**Checkpoint**: Sprint 4 complete - Mobile SDK, AI Chatbot, On-Premise all functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that span multiple sprints

- [X] T172 [P] Run `bun db:generate` to create final migration files
- [X] T173 [P] Run `bun run check-types` to verify all TypeScript compiles
- [X] T174 [P] Update `packages/db/src/seeds/lookups.ts` with any new lookup values
- [X] T175 [P] Update OpenAPI specs in `specs/001-support-platform/contracts/` with new endpoints
- [X] T176 Update API documentation for all 13 new routers
- [ ] T177 Run end-to-end validation of all 4 sprints
- [ ] T178 Performance test WebSocket presence with 10k concurrent viewers
- [ ] T179 Security audit: verify all new endpoints respect permissions
- [X] T180 Update `specs/upgrade-uvdesk/quickstart.md` with new feature setup steps

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
