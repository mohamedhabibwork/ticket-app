# Tasks: Unified Customer Support & Ticket Management Platform

**Input**: Design documents from `/specs/001-support-platform/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md
**Tests**: Not requested - omitting test tasks per spec.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `apps/server/src/`, `apps/web/src/`, `packages/api/src/`, `packages/db/src/schema/`
- Structure per plan.md

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize monorepo structure and shared tooling

- [ ] T001 [P] Create packages/db/src/schema/\_lookups.ts with lookupTypes and lookups tables
- [ ] T002 [P] Create packages/db/src/schema/\_organizations.ts with organizations, organizationSettings, brandingConfigs, themes tables
- [ ] T003 [P] Create packages/db/src/schema/\_users.ts with users, roles, permissions, rolePermissions, userRoles, teams, teamMembers, userSessions, twoFactorAuth, apiKeys, ipWhitelist tables
- [ ] T004 [P] Create packages/db/src/schema/\_contacts.ts with contacts, contactNotes tables
- [ ] T005 [P] Create packages/db/src/schema/\_mailboxes.ts with mailboxes, mailboxImapConfigs, mailboxSmtpConfigs, mailboxAliases, emailRoutingRules, emailMessages, emailAttachments tables
- [ ] T006 [P] Create packages/db/src/schema/\_tickets.ts with tickets, ticketMessages, ticketAttachments, tags, ticketTags, ticketFollowers, ticketCc, ticketMerges, ticketCustomFieldValues, ticketViews tables
- [ ] T007 [P] Create packages/db/src/schema/\_sla.ts with slaPolicies, slaPolicyTargets, ticketSla, ticketCustomFields, csatSurveys tables
- [ ] T008 [P] Create packages/db/src/schema/\_savedReplies.ts with savedReplyFolders, savedReplies tables
- [ ] T009 [P] Create packages/db/src/schema/\_tasks.ts with tasks, taskAssignees, taskChecklistItems tables
- [ ] T010 [P] Create packages/db/src/schema/\_forms.ts with forms, formFields, formSubmissions, formSubmissionValues tables
- [ ] T011 [P] Create packages/db/src/schema/\_workflows.ts with workflows, workflowExecutionLogs tables
- [ ] T012 [P] Create packages/db/src/schema/\_social.ts with socialAccounts, socialMessages tables
- [ ] T013 [P] Create packages/db/src/schema/\_channels.ts with channels table
- [ ] T014 [P] Create packages/db/src/schema/\_knowledgebase.ts with kbCategories, kbArticles, kbArticleRelated, kbArticleFeedback tables
- [ ] T015 [P] Create packages/db/src/schema/\_chat.ts with chatWidgets, chatSessions, chatMessages tables
- [ ] T016 [P] Create packages/db/src/schema/\_ecommerce.ts with ecommerceStores, ecommerceOrders tables
- [ ] T017 [P] Create packages/db/src/schema/\_billing.ts with subscriptionPlans, planFeatures, planLimits, addons, subscriptions, seats, usageSnapshots tables
- [ ] T018 [P] Create packages/db/src/schema/\_invoices.ts with invoices, invoiceItems, payments tables
- [ ] T019 [P] Create packages/db/src/schema/\_paymentMethods.ts with paymentMethods, coupons, couponRedemptions tables
- [ ] T020 [P] Create packages/db/src/schema/\_gateway.ts with stripeCustomers, stripeSubscriptions, stripePaymentMethods, paytabsTransactions tables
- [ ] T021 [P] Create packages/db/src/schema/\_dunning.ts with dunningLogs, subscriptionStateChanges tables
- [ ] T022 [P] Create packages/db/src/schema/\_revenue.ts with revenueSnapshots, mrrHistory tables
- [ ] T023 [P] Create packages/db/src/schema/\_audit.ts with auditLogs, notifications, notificationChannels tables
- [ ] T024 Create packages/db/src/schema/index.ts exporting all schemas with proper relations
- [ ] T025 Configure drizzle.config.ts pointing to packages/db/src/schema/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T026 [P] Implement ORPC router structure in packages/api/src/routers/index.ts
- [x] T027 [P] Setup auth middleware in apps/server/src/middleware/auth.ts (session validation, organization isolation)
- [x] T028 [P] Setup CORS and security headers middleware in apps/server/src/middleware/security.ts
- [x] T029 [P] Create organization context isolation middleware in apps/server/src/middleware/organization.ts
- [x] T030 [P] Setup error handling middleware in apps/server/src/middleware/error.ts
- [x] T031 [P] Implement Redis session store configuration in packages/db/src/lib/sessions.ts
- [x] T032 [P] Create bcrypt password hashing utility in packages/api/src/lib/auth.ts
- [x] T033 [P] Setup BullMQ queues in packages/db/src/lib/queues.ts (email, workflow, notification queues)
- [x] T034 Create database seed for lookup_types in packages/db/src/seeds/lookups.ts
- [x] T035 Create database seed for system roles in packages/db/src/seeds/roles.ts (owner, administrator, supervisor, agent, readonly)
- [x] T036 Create database seed for system permissions in packages/db/src/seeds/permissions.ts
- [x] T037 Create database seed for default subscription plans in packages/db/src/seeds/plans.ts (Free, Starter, Professional, Enterprise)
- [x] T038 Setup S3-compatible storage utility in packages/api/src/lib/storage.ts with presigned URL generation
- [x] T039 Configure dotenv loading in apps/server/src/index.ts
- [ ] T040 Run bun db:push to create initial database schema

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Multi-Channel Ticket Submission (Priority: P1) 🎯 MVP

**Goal**: Enable ticket creation from email, web forms, live chat, social media, and API with routing and acknowledgment

**Independent Test**: A customer submits a ticket via web form and receives a confirmation email with a reference number within 30 seconds.

### Implementation for User Story 1

- [x] T041 [P] [US1] Create reference number generator utility in packages/api/src/lib/reference.ts
- [x] T042 [P] [US1] Create contacts router in packages/api/src/routers/contacts.ts (list, get, create)
- [x] T043 [P] [US1] Create tickets router in packages/api/src/routers/tickets.ts (list, get, create)
- [x] T044 [US1] Implement ticket creation in packages/api/src/routers/tickets.ts with reference number generation
- [x] T045 [US1] Create mailboxes router in packages/api/src/routers/mailboxes.ts (list, get, create)
- [x] T046 [US1] Create email processing service in packages/api/src/services/email.ts for IMAP polling
- [x] T047 [US1] Implement email-to-ticket conversion in packages/api/src/services/email.ts
- [x] T048 [US1] Implement email threading by In-Reply-To header in packages/api/src/services/email.ts
- [x] T049 [US1] Create form submissions router in packages/api/src/routers/forms.ts (submit endpoint)
- [x] T050 [US1] Implement form-to-ticket conversion in packages/api/src/services/form.ts
- [x] T051 [US1] Create channels router in packages/api/src/routers/channels.ts (unified channel registry)
- [x] T052 [US1] Implement ticket routing rules evaluation in packages/api/src/services/routing.ts
- [x] T053 [US1] Add CC/BCC recipient handling in tickets router
- [x] T054 [US1] Create email auto-reply template service in packages/api/src/services/autoReply.ts
- [x] T055 [US1] Implement contact duplicate detection by email in contacts router
- [x] T056 [US1] Add webhook endpoint for inbound email in apps/server/src/routes/email.ts
- [x] T057 [US1] Create web component for ticket submission form in apps/web/src/components/ticket-form.tsx
- [x] T058 [US1] Create API endpoint for public ticket submission in apps/server/src/routes/api.ts

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Agent Ticket Management (Priority: P1)

**Goal**: Support agents can view, update, and respond to tickets from a unified inbox with timeline and assignment

**Independent Test**: An agent receives a new ticket, replies to the customer, changes the status to resolved, and the timeline shows all activities in order.

### Implementation for User Story 2

- [x] T059 [P] [US2] Create ticket messages router in packages/api/src/routers/ticketMessages.ts
- [x] T060 [P] [US2] Create tags router in packages/api/src/routers/tags.ts
- [x] T061 [P] [US2] Create teams router in packages/api/src/routers/teams.ts
- [x] T062 [US2] Implement ticket message creation (reply/note) in packages/api/src/routers/ticketMessages.ts
- [x] T063 [US2] Implement internal notes (isPrivate=true) in ticketMessages router
- [x] T064 [US2] Implement ticket assignment to agent/team in tickets router
- [x] T065 [US2] Implement ticket status transitions in tickets router
- [x] T066 [US2] Implement ticket timeline aggregation in tickets router (messages, notes, activities)
- [x] T067 [US2] Create saved replies router in packages/api/src/routers/savedReplies.ts
- [x] T068 [US2] Implement saved reply merge tags substitution in packages/api/src/services/savedReplies.ts
- [x] T069 [US2] Implement ticket merge functionality in tickets router
- [x] T070 [US2] Implement ticket locking during active reply in tickets router
- [x] T071 [US2] Create ticket attachments router in packages/api/src/routers/ticketAttachments.ts
- [x] T072 [US2] Implement bulk ticket operations (assign, tag, status change) in tickets router
- [x] T073 [US2] Create ticket views router in packages/api/src/routers/ticketViews.ts (saved filtered views)
- [x] T074 [US2] Create ticket inbox page in apps/web/src/pages/tickets/index.tsx
- [x] T075 [US2] Create ticket detail page with timeline in apps/web/src/pages/tickets/[id].tsx
- [x] T076 [US2] Create reply composer component in apps/web/src/components/ticket-reply.tsx
- [x] T077 [US2] Create internal note component in apps/web/src/components/ticket-note.tsx
- [x] T078 [US2] Create saved reply picker in apps/web/src/components/saved-reply-picker.tsx

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - SLA Enforcement and Escalation (Priority: P2)

**Goal**: System enforces SLA policies based on ticket priority with breach detection and escalation

**Independent Test**: A high-priority ticket is created. After the SLA first-response time passes without a reply, the agent sees a visual warning and the ticket is flagged as breached.

### Implementation for User Story 3

- [x] T079 [P] [US3] Create SLA policies router in packages/api/src/routers/slaPolicies.ts
- [x] T080 [P] [US3] Create ticket SLA tracking router in packages/api/src/routers/ticketSla.ts
- [x] T081 [US3] Implement SLA timer calculation in packages/api/src/services/sla.ts (business hours, holidays)
- [x] T082 [US3] Implement SLA timer pause/resume on status change in packages/api/src/services/sla.ts
- [x] T083 [US3] Implement SLA breach detection job in packages/api/src/jobs/slaBreachCheck.ts (BullMQ)
- [x] T084 [US3] Implement SLA breach escalation actions in packages/api/src/services/sla.ts
- [x] T085 [US3] Add visual breach indicators to ticket responses in ticketMessages router
- [x] T086 [US3] Create CSAT surveys router in packages/api/src/routers/csatSurveys.ts
- [x] T087 [US3] Implement post-resolution CSAT survey sending in packages/api/src/services/csat.ts
- [x] T088 [US3] Create SLA breach warning badge component in apps/web/src/components/sla-badge.tsx

**Checkpoint**: User Story 3 should be independently functional

---

## Phase 6: User Story 4 - Self-Service Knowledgebase (Priority: P2)

**Goal**: Organizations can publish help articles that customers can search for self-service

**Independent Test**: A customer searches the knowledgebase, finds a relevant article, and resolves their question without submitting a ticket.

### Implementation for User Story 4

- [x] T089 [P] [US4] Create KB categories router in packages/api/src/routers/kbCategories.ts
- [x] T090 [P] [US4] Create KB articles router in packages/api/src/routers/kbArticles.ts
- [x] T091 [US4] Implement full-text search for KB articles using PostgreSQL tsvector in packages/api/src/services/kbSearch.ts
- [x] T092 [US4] Implement KB article feedback submission in packages/api/src/routers/kbArticles.ts
- [x] T093 [US4] Create KB article suggestion service for agents in packages/api/src/services/kbSuggestion.ts
- [x] T094 [US4] Create KB public portal page in apps/web/src/pages/kb/index.tsx
- [x] T095 [US4] Create KB article detail page in apps/web/src/pages/kb/[slug].tsx
- [x] T096 [US4] Create KB search component in apps/web/src/components/kb-search.tsx
- [x] T097 [US4] Create KB feedback component in apps/web/src/components/kb-feedback.tsx

**Checkpoint**: User Story 4 should be independently functional

---

## Phase 7: User Story 5 - Billing and Subscription Management (Priority: P1)

**Goal**: Organization owners can view their current plan, upgrade/downgrade, manage seats, and view invoices

**Independent Test**: An organization with 3 agents attempts to add a 4th agent. The system blocks the action and shows an upgrade prompt since the Starter plan limits agents to 3.

### Implementation for User Story 5

- [x] T098 [P] [US5] Create subscriptions router in packages/api/src/routers/subscriptions.ts
- [x] T099 [P] [US5] Create invoices router in packages/api/src/routers/invoices.ts
- [x] T100 [P] [US5] Create payment methods router in packages/api/src/routers/paymentMethods.ts
- [x] T101 [US5] Implement seat limit enforcement on user creation in users router
- [x] T102 [US5] Implement plan upgrade/downgrade in subscriptions router
- [x] T103 [US5] Create Stripe integration service in packages/api/src/services/stripe.ts
- [x] T104 [US5] Create PayTabs integration service in packages/api/src/services/paytabs.ts
- [x] T105 [US5] Implement invoice generation with sequential numbering INV-{org_slug}-{year}-{seq} in packages/api/src/services/invoice.ts
- [x] T106 [US5] Implement Arabic invoice PDF generation with RTL formatting in packages/api/src/services/invoicePdf.ts
- [x] T107 [US5] Implement GCC VAT calculation in packages/api/src/services/vat.ts
- [x] T108 [US5] Create Stripe webhook handler in apps/server/src/routes/webhooks/stripe.ts
- [x] T109 [US5] Create PayTabs webhook handler in apps/server/src/routes/webhooks/paytabs.ts
- [x] T110 [US5] Create billing portal page in apps/web/src/pages/billing/index.tsx
- [x] T111 [US5] Create plan upgrade component in apps/web/src/components/plan-upgrade.tsx
- [x] T112 [US5] Create seat management component in apps/web/src/components/seat-management.tsx

**Checkpoint**: User Story 5 should be independently functional

---

## Phase 8: User Story 6 - Workflow Automation (Priority: P2)

**Goal**: Administrators can create automation rules that trigger actions based on ticket events

**Independent Test**: An admin creates a rule: "When ticket priority is Urgent, assign to the Urgent Team." When an urgent ticket is created, it is automatically assigned without manual intervention.

### Implementation for User Story 6

- [x] T113 [P] [US6] Create workflows router in packages/api/src/routers/workflows.ts
- [x] T114 [P] [US6] Create workflow execution logs router in packages/api/src/routers/workflowLogs.ts
- [x] T115 [US6] Implement workflow rule engine JSONB condition evaluation in packages/api/src/services/workflowEngine.ts
- [x] T116 [US6] Implement workflow actions (assign, set priority/status, add/remove tags, send email, send webhook, create task, add note, apply saved reply) in packages/api/src/services/workflowActions.ts
- [x] T117 [US6] Implement circular workflow loop detection in packages/api/src/services/workflowEngine.ts
- [x] T118 [US6] Create workflow execution job in packages/api/src/jobs/workflowExecute.ts (BullMQ)
- [x] T119 [US6] Implement workflow trigger hooks on ticket events in ticket creation/update
- [x] T120 [US6] Create workflow builder UI in apps/web/src/pages/admin/workflows/builder.tsx

**Checkpoint**: User Story 6 should be independently functional

---

## Phase 9: User Story 7 - Social Media Integration (Priority: P3)

**Goal**: Organizations can connect social media accounts and receive messages as tickets

**Independent Test**: A customer sends a Direct Message on Instagram. An agent sees it appear as a ticket in their inbox and replies from the same interface.

### Implementation for User Story 7

- [x] T121 [P] [US7] Create social accounts router in packages/api/src/routers/socialAccounts.ts
- [x] T122 [P] [US7] Create social messages router in packages/api/src/routers/socialMessages.ts
- [x] T123 [US7] Implement Facebook/Instagram OAuth connection in packages/api/src/services/social/facebook.ts
- [x] T124 [US7] Implement Twitter/X OAuth connection in packages/api/src/services/social/twitter.ts
- [x] T125 [US7] Implement WhatsApp Business API integration in packages/api/src/services/social/whatsapp.ts
- [x] T126 [US7] Implement social message-to-ticket conversion in packages/api/src/services/social.ts
- [x] T127 [US7] Implement social reply posting back to platform in packages/api/src/services/social.ts
- [x] T128 [US7] Create social account connection UI in apps/web/src/pages/admin/social/connect.tsx
- [x] T129 [US7] Create social channel badge component in apps/web/src/components/channel-badge.tsx

**Checkpoint**: User Story 7 should be independently functional

---

## Phase 10: User Story 8 - eCommerce Order-Aware Support (Priority: P3)

**Goal**: Agents can see customer order history from connected eCommerce stores directly in the ticket sidebar

**Independent Test**: A customer submits a ticket about a recent order. The agent sees the order details (items, status, tracking) in the ticket sidebar and can help without asking the customer for order information.

### Implementation for User Story 8

- [x] T130 [P] [US8] Create eCommerce stores router in packages/api/src/routers/ecommerceStores.ts
- [x] T131 [P] [US8] Create eCommerce orders router in packages/api/src/routers/ecommerceOrders.ts
- [x] T132 [US8] Implement Shopify integration service in packages/api/src/services/ecommerce/shopify.ts
- [x] T133 [US8] Implement WooCommerce integration service in packages/api/src/services/ecommerce/woocommerce.ts
- [x] T134 [US8] Implement Salla integration service in packages/api/src/services/ecommerce/salla.ts
- [x] T135 [US8] Implement Zid integration service in packages/api/src/services/ecommerce/zid.ts
- [x] T136 [US8] Create order sync job in packages/api/src/jobs/ecommerceSync.ts (BullMQ, 15-min interval)
- [x] T137 [US8] Implement order lookup by email/phone/order ID in packages/api/src/services/orderLookup.ts
- [x] T138 [US8] Create order panel component in apps/web/src/components/order-panel.tsx
- [x] T139 [US8] Create eCommerce store connection UI in apps/web/src/pages/admin/ecommerce/connect.tsx

**Checkpoint**: User Story 8 should be independently functional

---

## Phase 11: User Story 9 - Binaka Live Chat (Priority: P2)

**Goal**: Real-time chat widget with WebSocket support, pre-chat form, and auto-ticket conversion

### Implementation for User Story 9

- [x] T140 [P] [US9] Create chat widgets router in packages/api/src/routers/chatWidgets.ts
- [x] T141 [P] [US9] Create chat sessions router in packages/api/src/routers/chatSessions.ts
- [x] T142 [P] [US9] Create chat messages router in packages/api/src/routers/chatMessages.ts
- [x] T143 [US9] Implement WebSocket chat handler in apps/server/src/routes/chat.ts
- [x] T144 [US9] Implement typing indicators in chat service
- [x] T145 [US9] Implement pre-chat form collection in chat widget
- [x] T146 [US9] Implement unresolved chat-to-ticket auto-conversion in packages/api/src/services/chat.ts
- [x] T147 [US9] Create chat widget JavaScript snippet generator in packages/api/src/services/chatWidget.ts
- [x] T148 [US9] Create chat dashboard page in apps/web/src/pages/chat/index.tsx

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T149 [P] Add dark mode support with themes table in apps/web/src/lib/theme.tsx
- [x] T150 [P] Add RTL layout support for Arabic in apps/web/src/lib/rtl.tsx
- [x] T151 [P] Implement white-label branding config loading in apps/web/src/lib/branding.tsx
- [x] T152 [P] Create custom domain resolution middleware in apps/server/src/middleware/customDomain.ts
- [x] T153 Add audit logging middleware for sensitive actions in apps/server/src/middleware/audit.ts
- [x] T154 Implement API rate limiting per key (1000/min standard, 5000/min Enterprise) in apps/server/src/middleware/rateLimit.ts
- [x] T155 Setup structured logging with JSON format in apps/server/src/lib/logger.ts
- [x] T156 Setup metrics collection for dashboards in apps/server/src/lib/metrics.ts
- [x] T157 Setup distributed tracing headers in apps/server/src/middleware/tracing.ts
- [x] T158 Add 2FA enforcement option for organizations in apps/server/src/routes/admin.ts
- [x] T159 Create admin billing console page for platform admins in apps/web/src/pages/admin/billing/index.tsx
- [x] T160 Create revenue reports page in apps/web/src/pages/admin/reports/index.tsx
- [x] T161 Performance optimization: Add database indexes for common query patterns
- [x] T162 Security hardening: Validate all input with Zod schemas across all endpoints
- [x] T163 Run quickstart.md validation against implemented features

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Setup completion - BLOCKS all user stories
- **Phase 3-10 (User Stories)**: All depend on Foundational phase completion
  - User stories can proceed in parallel if team capacity allows
  - Or sequentially in priority order (P1 → P2 → P3)
- **Phase 11 (Chat)**: Depends on US1 completion (ticket infrastructure)
- **Phase 12 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational - No dependencies on other stories
- **US2 (P1)**: Can start after Foundational - Builds on US1 entities but independently testable
- **US3 (P2)**: Can start after Foundational - Needs tickets from US1
- **US4 (P2)**: Can start after Foundational - Independent of other stories
- **US5 (P1)**: Can start after Foundational - Independent billing system
- **US6 (P2)**: Can start after Foundational - Needs tickets from US1
- **US7 (P3)**: Can start after Foundational - Needs social accounts, tickets
- **US8 (P3)**: Can start after Foundational - Needs eCommerce stores, tickets
- **US9 (P2)**: Can start after Foundational - Needs chat widgets, tickets

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: T041 "Create reference number generator utility"
Task: T042 "Create contacts router"
Task: T043 "Create tickets router"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Continue with remaining stories in priority order
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 + US2 (ticket core - P1)
   - Developer B: US5 (billing - P1)
   - Developer C: US3 + US4 (SLA + KB - P2)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Total: 163 tasks across 12 phases
