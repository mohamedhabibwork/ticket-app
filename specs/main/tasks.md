# Implementation Tasks

**Branch**: `main` | **Generated**: 2026-04-09  
**Plan**: `specs/main/plan.md`

## Overview

This file contains all implementation tasks organized by phase. Tasks marked `[P]` can be executed in parallel within their group.

---

## PHASE 1: Core Completion (Weeks 1-4)

### 1.1 Backend: New API Routers

- [x] **T1.1.1** Create `packages/api/src/routers/emailMessages.ts` - Email message router with 9 procedures (list, get, send, reply, forward, markSpam, markNotSpam, getAttachment, getThread)
- [x] **T1.1.2** Create `packages/api/src/routers/reports.ts` - Reports router with 10 procedures (getTicketVolume, getAgentPerformance, getSlaCompliance, getCsatTrends, getResponseTime, getResolutionRate, exportReport, getCustomReport, createCustomReport)
- [x] **T1.1.3** Create `packages/api/src/routers/ai.ts` - AI router with 9 procedures (suggestReplies, analyzeSentiment, predictPriority, suggestRouting, suggestArticles, generateDraft, detectLanguage, summarize)
- [x] **T1.1.4** Create `packages/api/src/routers/sessions.ts` - Session management router with 5 procedures (list, revoke, revokeAll, getActive, extend)
- [x] **T1.1.5** Create `packages/api/src/routers/tasks.ts` - Task management router with 10 procedures (list, get, create, update, delete, assign, complete, addComment, getSubtasks, createSubtask)

### 1.2 Backend: Complete Existing Routers

- [x] **T1.2.1** Complete `packages/api/src/routers/mailboxes.ts` - Add 12 procedures (update, delete, testConnection, configureImap, configureSmtp, syncNow, getStatistics, addAlias, removeAlias, createRoutingRule, updateRoutingRule, deleteRoutingRule)
- [x] **T1.2.2** Complete `packages/api/src/routers/chatSessions.ts` - Add 4 procedures (getActiveSessions, getStats, sendTypingIndicator, sendReadReceipt)
- [x] **T1.2.3** Complete `packages/api/src/routers/chatMessages.ts` - Add 2 procedures (send, reactions)
- [x] **T1.2.4** Complete `packages/api/src/routers/contacts.ts` - Add 2 procedures (duplicateDetection, merge)
- [x] **T1.2.5** Complete `packages/api/src/routers/ecommerceStores.ts` - Add 10 procedures (connectShopify, connectWooCommerce, connectSalla, connectZid, disconnect, syncNow, getSyncStatus, getOrders, searchOrders)
- [x] **T1.2.6** Complete `packages/api/src/routers/socialAccounts.ts` - Add 7 procedures (connectFacebook, connectInstagram, connectTwitter, connectWhatsApp, disconnect, refreshToken, getStatus)
- [x] **T1.2.7** Complete `packages/api/src/routers/workflows.ts` - Add 4 procedures (execute, simulate, getExecutionLogs, toggleActive)
- [x] **T1.2.8** Complete `packages/api/src/routers/savedReplies.ts` - Add 3 procedures (folders CRUD, merge tags)
- [x] **T1.2.9** Complete `packages/api/src/routers/users.ts` - Add 3 procedures (invite, passwordReset, updateProfile)
- [x] **T1.2.10** Complete `packages/api/src/routers/tickets.ts` - Add 2 procedures (merge, lock)

### 1.3 Queue Workers

- [x] **T1.3.1** Create `packages/queue/src/workers/email-fetch.worker.ts` - IMAP polling, email→ticket conversion, threading, spam detection
- [x] **T1.3.2** Create `packages/queue/src/workers/email-send.worker.ts` - SMTP sending, template rendering, bounce handling

### 1.4 Frontend Web: Mailboxes & Email

- [x] **T1.4.1** Create `apps/web/src/routes/admin/mailboxes/index.tsx` - Mailbox list page
- [x] **T1.4.2** Create `apps/web/src/routes/admin/mailboxes/new.tsx` - Add mailbox page
- [x] **T1.4.3** Create `apps/web/src/routes/admin/mailboxes/[id]/index.tsx` - Mailbox detail page
- [x] **T1.4.4** Create `apps/web/src/routes/admin/mailboxes/[id]/configure.tsx` - IMAP/SMTP configuration page
- [x] **T1.4.5** Create `apps/web/src/routes/admin/mailboxes/[id]/routing.tsx` - Routing rules page
- [x] **T1.4.6** Create `apps/web/src/routes/admin/email-templates/index.tsx` - Email templates page

### 1.5 Frontend Web: Users & Roles

- [x] **T1.5.1** Create `apps/web/src/routes/admin/users/index.tsx` - User list page
- [x] **T1.5.2** Create `apps/web/src/routes/admin/users/invite.tsx` - Invite user page
- [x] **T1.5.3** Create `apps/web/src/routes/admin/users/[id].tsx` - User detail page
- [x] **T1.5.4** Create `apps/web/src/routes/admin/roles/index.tsx` - Role list page
- [x] **T1.5.5** Create `apps/web/src/routes/admin/roles/new.tsx` - Create role page
- [x] **T1.5.6** Create `apps/web/src/routes/admin/roles/[id]/index.tsx` - Edit role page
- [x] **T1.5.7** Create `apps/web/src/routes/admin/roles/[id]/permissions.tsx` - Permission editor page

### 1.6 Frontend Web: Tickets

- [x] **T1.6.1** Create `apps/web/src/routes/tickets/new.tsx` - Create ticket page
- [x] **T1.6.2** Create `apps/web/src/routes/tickets/kanban.tsx` - Kanban board view
- [x] **T1.6.3** Create `apps/web/src/routes/tickets/spam.tsx` - Spam queue page
- [x] **T1.6.4** Create `apps/web/src/routes/tickets/merged.tsx` - Merged tickets page

---

## PHASE 2: Module Completion (Weeks 5-8)

### 2.1 Queue Workers

- [x] **T2.1.1** Create `packages/queue/src/workers/sla-check.worker.ts` - SLA timer checking, breach detection, escalation triggers
- [x] **T2.1.2** Create `packages/queue/src/workers/csat-survey.worker.ts` - Send CSAT surveys, process responses
- [x] **T2.1.3** Create `packages/queue/src/workers/workflow-execute.worker.ts` - Workflow rule execution, loop detection

### 2.2 Frontend Web: Workflows

- [x] **T2.2.1** Create `apps/web/src/routes/admin/workflows/index.tsx` - Workflow list page
- [x] **T2.2.2** Create `apps/web/src/routes/admin/workflows/new.tsx` - Create workflow page
- [x] **T2.2.3** Update `apps/web/src/routes/admin/workflows/builder.tsx` - Visual workflow builder
- [x] **T2.2.4** Create `apps/web/src/routes/admin/workflows/[id]/index.tsx` - Workflow detail page
- [x] **T2.2.5** Create `apps/web/src/routes/admin/workflows/[id]/logs.tsx` - Execution logs page

### 2.3 Frontend Web: Forms

- [x] **T2.3.1** Create `apps/web/src/routes/admin/forms/index.tsx` - Form list page
- [x] **T2.3.2** Create `apps/web/src/routes/admin/forms/new.tsx` - Create form page
- [x] **T2.3.3** Create `apps/web/src/routes/admin/forms/builder.tsx` - Drag-drop form builder
- [x] **T2.3.4** Create `apps/web/src/routes/admin/forms/[id]/index.tsx` - Form settings page
- [x] **T2.3.5** Create `apps/web/src/routes/admin/forms/[id]/submissions.tsx` - View submissions page
- [x] **T2.3.6** Create `apps/web/src/routes/forms/[id].tsx` - Public form page (customer-facing)

### 2.4 Frontend Web: SLA & Saved Replies

- [x] **T2.4.1** Create `apps/web/src/routes/admin/sla/index.tsx` - SLA policies list page
- [x] **T2.4.2** Create `apps/web/src/routes/admin/sla/new.tsx` - Create SLA policy page
- [x] **T2.4.3** Create `apps/web/src/routes/admin/saved-replies/index.tsx` - Saved replies page
- [x] **T2.4.4** Create `apps/web/src/routes/admin/saved-replies/folders.tsx` - Folder management page

### 2.5 Frontend Web: Reports

- [x] **T2.5.1** Create `apps/web/src/routes/admin/reports/index.tsx` - Reports dashboard
- [x] **T2.5.2** Create `apps/web/src/routes/admin/reports/tickets.tsx` - Ticket reports page
- [x] **T2.5.3** Create `apps/web/src/routes/admin/reports/agents.tsx` - Agent performance page
- [x] **T2.5.4** Create `apps/web/src/routes/admin/reports/sla.tsx` - SLA compliance page
- [x] **T2.5.5** Create `apps/web/src/routes/admin/reports/csat.tsx` - CSAT scores page
- [x] **T2.5.6** Create `apps/web/src/routes/admin/reports/custom.tsx` - Custom reports page

### 2.6 Frontend Web: Billing

- [x] **T2.6.1** Update `apps/web/src/routes/billing/index.tsx` - Billing overview page
- [x] **T2.6.2** Create `apps/web/src/routes/billing/upgrade.tsx` - Plan upgrade page
- [x] **T2.6.3** Create `apps/web/src/routes/billing/invoices.tsx` - Invoice history page
- [x] **T2.6.4** Create `apps/web/src/routes/billing/payment-methods.tsx` - Payment methods page
- [x] **T2.6.5** Create `apps/web/src/routes/billing/seats.tsx` - Seat management page

### 2.7 Frontend Web: Dashboard

- [x] **T2.7.1** Create `apps/web/src/routes/dashboard/index.tsx` - Main agent dashboard

---

## PHASE 3: Integrations (Weeks 9-12)

### 3.1 Queue Workers

- [x] **T3.1.1** Create `packages/queue/src/workers/social-sync.worker.ts` - Social media polling, message sync
- [x] **T3.1.2** Create `packages/queue/src/workers/ecommerce-sync.worker.ts` - eCommerce order sync
- [x] **T3.1.3** Create `packages/queue/src/workers/notification-delivery.worker.ts` - Push notifications, email digests

### 3.2 Frontend Web: Social & eCommerce

- [x] **T3.2.1** Create `apps/web/src/routes/admin/social/index.tsx` - Social accounts list
- [x] **T3.2.2** Create `apps/web/src/routes/admin/social/facebook.tsx` - Facebook connection
- [x] **T3.2.3** Create `apps/web/src/routes/admin/social/instagram.tsx` - Instagram connection
- [x] **T3.2.4** Create `apps/web/src/routes/admin/social/twitter.tsx` - Twitter connection
- [x] **T3.2.5** Create `apps/web/src/routes/admin/social/whatsapp.tsx` - WhatsApp connection
- [x] **T3.2.6** Create `apps/web/src/routes/admin/ecommerce/index.tsx` - Store list page
- [x] **T3.2.7** Create `apps/web/src/routes/admin/ecommerce/connect.tsx` - Connect store page
- [x] **T3.2.8** Create `apps/web/src/routes/admin/ecommerce/[id].tsx` - Store detail page

### 3.3 Frontend Web: Branding & Security

- [x] **T3.3.1** Create `apps/web/src/routes/admin/branding/index.tsx` - White-label settings
- [x] **T3.3.2** Create `apps/web/src/routes/admin/branding/theme.tsx` - Theme editor
- [x] **T3.3.3** Create `apps/web/src/routes/admin/branding/email.tsx` - Email template customization
- [x] **T3.3.4** Create `apps/web/src/routes/admin/branding/portal.tsx` - Portal customization
- [x] **T3.3.5** Create `apps/web/src/routes/admin/security/index.tsx` - Security settings
- [x] **T3.3.6** Create `apps/web/src/routes/admin/security/sso.tsx` - SSO configuration
- [x] **T3.3.7** Create `apps/web/src/routes/admin/security/ip-whitelist.tsx` - IP whitelist
- [x] **T3.3.8** Create `apps/web/src/routes/admin/custom-domain.tsx` - Custom domain configuration

### 3.4 Frontend Web: Additional Pages

- [x] **T3.4.1** Create `apps/web/src/routes/contacts/index.tsx` - Contact list
- [x] **T3.4.2** Create `apps/web/src/routes/contacts/new.tsx` - Create contact
- [x] **T3.4.3** Create `apps/web/src/routes/contacts/[id].tsx` - Contact detail
- [x] **T3.4.4** Create `apps/web/src/routes/teams/index.tsx` - Team list
- [x] **T3.4.5** Create `apps/web/src/routes/teams/new.tsx` - Create team
- [x] **T3.4.6** Create `apps/web/src/routes/teams/[id].tsx` - Team detail
- [x] **T3.4.7** Create `apps/web/src/routes/chat/active.tsx` - Active chat sessions
- [x] **T3.4.8** Create `apps/web/src/routes/chat/ended.tsx` - Chat history
- [x] **T3.4.9** Create `apps/web/src/routes/chat/[id].tsx` - Chat conversation
- [x] **T3.4.10** Create `apps/web/src/routes/kb/new.tsx` - Create KB article
- [x] **T3.4.11** Create `apps/web/src/routes/kb/categories/index.tsx` - KB categories
- [x] **T3.4.12** Create `apps/web/src/routes/kb/categories/[id].tsx` - Category detail
- [x] **T3.4.13** Create `apps/web/src/routes/settings/index.tsx` - Settings index
- [x] **T3.4.14** Create `apps/web/src/routes/settings/profile.tsx` - Profile settings
- [x] **T3.4.15** Create `apps/web/src/routes/settings/password.tsx` - Change password
- [x] **T3.4.16** Create `apps/web/src/routes/settings/security.tsx` - Security settings
- [x] **T3.4.17** Create `apps/web/src/routes/settings/notifications.tsx` - Notification preferences
- [x] **T3.4.18** Create `apps/web/src/routes/settings/appearance.tsx` - Appearance settings

### 3.5 Frontend Mobile

- [x] **T3.5.1** Create `apps/native/app/(drawer)/tickets/index.tsx` - Mobile ticket list
- [x] **T3.5.2** Create `apps/native/app/(drawer)/tickets/[id].tsx` - Mobile ticket detail
- [x] **T3.5.3** Create `apps/native/app/(drawer)/tickets/new.tsx` - Mobile create ticket
- [x] **T3.5.4** Create `apps/native/app/(drawer)/tickets/[id]/replies.tsx` - Mobile replies
- [x] **T3.5.5** Create `apps/native/app/(drawer)/tickets/search.tsx` - Mobile ticket search
- [x] **T3.5.6** Create `apps/native/app/(drawer)/chat/index.tsx` - Mobile chat list
- [x] **T3.5.7** Create `apps/native/app/(drawer)/chat/[id].tsx` - Mobile chat conversation
- [x] **T3.5.8** Create `apps/native/app/(drawer)/chat/new.tsx` - Mobile new chat
- [x] **T3.5.9** Create `apps/native/app/(drawer)/kb/index.tsx` - Mobile KB home
- [x] **T3.5.10** Create `apps/native/app/(drawer)/kb/[id].tsx` - Mobile KB category
- [x] **T3.5.11** Create `apps/native/app/(drawer)/kb/article/[id].tsx` - Mobile KB article
- [x] **T3.5.12** Create `apps/native/app/(drawer)/kb/search.tsx` - Mobile KB search
- [x] **T3.5.13** Create `apps/native/app/(drawer)/contacts/index.tsx` - Mobile contacts
- [x] **T3.5.14** Create `apps/native/app/(drawer)/contacts/[id].tsx` - Mobile contact detail
- [x] **T3.5.15** Create `apps/native/app/(drawer)/profile/index.tsx` - Mobile profile
- [x] **T3.5.16** Create `apps/native/app/(drawer)/settings/index.tsx` - Mobile settings
- [x] **T3.5.17** Create `apps/native/app/(drawer)/settings/notifications.tsx` - Mobile notif prefs
- [x] **T3.5.18** Create `apps/native/app/(drawer)/settings/security.tsx` - Mobile security
- [x] **T3.5.19** Create `apps/native/app/(drawer)/admin/index.tsx` - Mobile admin dashboard
- [x] **T3.5.20** Create `apps/native/app/(drawer)/admin/teams.tsx` - Mobile team management
- [x] **T3.5.21** Create `apps/native/app/(drawer)/admin/users.tsx` - Mobile user management

---

## PHASE 4: Polish (Weeks 13-16)

### 4.1 RTL & Internationalization

- [x] **T4.1.1** Implement RTL CSS utilities in Tailwind config
- [x] **T4.1.2** Add Arabic translations (i18n) for all UI strings
- [x] **T4.1.3** Create RTL-aware form components
- [x] **T4.1.4** Generate Arabic invoice PDF with RTL formatting
- [x] **T4.1.5** Add language switcher component

### 4.2 UI Components

- [x] **T4.2.1** Create `packages/ui/src/components/data-table.tsx` - Generic data table
- [x] **T4.2.2** Create `packages/ui/src/components/paginator.tsx` - Pagination
- [x] **T4.2.3** Create `packages/ui/src/components/date-range-picker.tsx` - Date range
- [x] **T4.2.4** Create `packages/ui/src/components/file-upload.tsx` - File upload
- [x] **T4.2.5** Create `packages/ui/src/components/avatar.tsx` - User avatars
- [x] **T4.2.6** Create `packages/ui/src/components/badge.tsx` - Status badges
- [x] **T4.2.7** Create `packages/ui/src/components/modal.tsx` - Modal dialog
- [x] **T4.2.8** Create `packages/ui/src/components/drawer.tsx` - Slide-out drawer
- [x] **T4.2.9** Create `packages/ui/src/components/select.tsx` - Select dropdown
- [x] **T4.2.10** Create `packages/ui/src/components/calendar.tsx` - Calendar picker
- [x] **T4.2.11** Create `packages/ui/src/components/chart.tsx` - Chart wrapper

### 4.3 Performance & Security

- [x] **T4.3.1** Implement Redis caching layer
- [x] **T4.3.2** Add database query optimizations (indexes)
- [x] **T4.3.3** Implement API response caching
- [x] **T4.3.4** Add SAML SSO integration
- [x] **T4.3.5** Implement audit log search UI

### 4.4 Mobile Polish

- [x] **T4.4.1** Mobile responsiveness audit and fixes
- [x] **T4.4.2** Touch-friendly interactions
- [x] **T4.4.3** Gesture support (swipe actions)

---

## Task Dependencies

### Sequential Dependencies
1. T1.1.1 (emailMessages router) must complete before T1.3.1 (email-fetch worker)
2. T1.1.1 must complete before T1.4.6 (email templates)
3. T1.2.1 (mailboxes completion) must complete before T1.4.1-1.4.5 (mailbox pages)
4. T1.3.1 and T1.3.2 must complete before Phase 2 queue worker tasks

### Parallel Execution Groups [P]

**[P-Backend-New]**: T1.1.1, T1.1.2, T1.1.3, T1.1.4, T1.1.5 (can run in parallel)
**[P-Backend-Complete]**: T1.2.1 through T1.2.10 (can run in parallel)
**[P-Queue-Phase1]**: T1.3.1, T1.3.2 (can run in parallel)
**[P-Frontend-Mailboxes]**: T1.4.1 through T1.4.6 (can run in parallel)
**[P-Frontend-Users]**: T1.5.1 through T1.5.7 (can run in parallel)
**[P-Frontend-Tickets]**: T1.6.1 through T1.6.4 (can run in parallel)

---

## Execution Order

1. **Group P-Backend-New** (parallel) - New routers
2. **Group P-Backend-Complete** (parallel) - Complete existing routers
3. **Group P-Queue-Phase1** (parallel) - Email workers
4. **Group P-Frontend-Mailboxes** (parallel) - Mailbox UI
5. **Group P-Frontend-Users** (parallel) - User/Role UI
6. **Group P-Frontend-Tickets** (parallel) - Ticket UI
7. Continue with Phase 2, 3, 4 following same pattern

---

**Total Tasks**: 117 tasks
**Estimated Duration**: 24 weeks with 2-3 developers
