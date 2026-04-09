# Implementation Plan: Complete Feature Implementation

**Branch**: `main` | **Date**: 2026-04-09  
**Goal**: Complete ALL features, ALL pages (web/mobile), ALL backend

---

## Summary

Comprehensive plan to complete the unified customer support platform with:
- **35+ API routers** (85% complete, gaps identified)
- **60+ database tables** (100% complete)
- **10 frontend web routes** → **40+ pages needed**
- **8 mobile screens** → **25+ screens needed**
- **0 queue workers** → **8 workers needed**
- Full UVDesk parity + AI-powered enhancements

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Backend**: Hono 4.x, ORPC 0.4.x, Drizzle ORM 0.45.x  
**Frontend Web**: React 19, Vite, TanStack Router, TailwindCSS v4  
**Frontend Mobile**: React Native (Expo), NativeWind  
**Database**: PostgreSQL 16+, Redis (sessions/queues), S3-compatible storage  
**Queue**: BullMQ  
**AI**: Google Gemini (via AI SDK), OpenAI GPT, Anthropic Claude (abstracted)  
**Payments**: Stripe, PayTabs  
**Testing**: Vitest (unit), Playwright (e2e)  
**Project Type**: Multi-tenant SaaS (TypeScript monorepo)  
**Scale**: 10,000+ concurrent agents, 5-year data retention

---

## Part 1: Current State Analysis

### Backend API Routers (35 routers)

| Router | Status | Missing Procedures |
|--------|--------|-------------------|
| `admin.ts` | Partial | Platform admin operations |
| `channels.ts` | Partial | CRUD for channels |
| `chatMessages.ts` | Partial | Send message, reactions |
| `chatSessions.ts` | ~70% | WebSocket events, typing indicators |
| `chatWidgets.ts` | Partial | Full CRUD, generate embed code |
| `contacts.ts` | ~80% | Duplicate detection, merge |
| `csatSurveys.ts` | Partial | Send survey, respond |
| `ecommerceStores.ts` | ~50% | OAuth flows, sync trigger |
| `ecommerceOrders.ts` | Partial | Search by email/phone |
| `files.ts` | ~60% | Preview generation, virus scan |
| `forms.ts` | ~50% | Drag-drop builder support, submissions |
| `invoices.ts` | ~75% | PDF generation, send |
| `kbArticles.ts` | ~70% | Full-text search, related articles |
| `kbCategories.ts` | Partial | Reorder, articles list |
| `mailboxes.ts` | ~30% | IMAP/SMTP config, test, sync |
| `notifications.ts` | Partial | Mark read, preferences |
| `payments.ts` | ✅ Complete | - |
| `roles.ts` | Missing | Full RBAC router |
| `savedReplies.ts` | ~50% | Folders, merge tags |
| `sessions.ts` | Missing | Session management |
| `socialAccounts.ts` | ~40% | OAuth flows, message send |
| `socialMessages.ts` | Partial | Send, reactions |
| `subscriptions.ts` | ~80% | Upgrade/downgrade, trials |
| `tags.ts` | Partial | Merge, autocomplete |
| `tasks.ts` | Missing | Full task router |
| `teams.ts` | ~70% | Auto-assign config |
| `ticketAttachments.ts` | ✅ Complete | - |
| `ticketMessages.ts` | ✅ Complete | - |
| `ticketSla.ts` | ✅ Complete | - |
| `ticketViews.ts` | ~50% | Share, filters |
| `tickets.ts` | ~90% | Merge, lock, spam |
| `todo.ts` | Partial | Todo items |
| `users.ts` | ~80% | Invite, password reset |
| `workflowLogs.ts` | ✅ Complete | - |
| `workflows.ts` | ~60% | Execute, simulation |
| `emailMessages.ts` | **MISSING** | New router needed |
| `reports.ts` | **MISSING** | New router needed |
| `ai.ts` | **MISSING** | New router for AI features |

### Database Schema (60+ tables) - 100% Complete ✅

All schemas exist in `packages/db/src/schema/`:
- `_lookups.ts` - Lookup types and values
- `_organizations.ts` - Tenants, settings, branding
- `_users.ts` - Users, roles, permissions, sessions
- `_contacts.ts` - Customer contacts
- `_tickets.ts` - Tickets, messages, attachments, tags
- `_channels.ts` - Channel registry
- `_chat.ts` - Chat widgets, sessions, messages
- `_mailboxes.ts` - Email mailboxes, configs, routing
- `_knowledgebase.ts` - KB categories, articles
- `_billing.ts` - Plans, subscriptions, seats
- `_invoices.ts` - Invoices, line items
- `_paymentMethods.ts` - Payment methods, tokens
- `_gateway.ts` - Payment gateway records
- `_sla.ts` - SLA policies, CSAT surveys
- `_workflows.ts` - Automation rules
- `_savedReplies.ts` - Canned responses
- `_tasks.ts` - Task management
- `_forms.ts` - Form builder
- `_ecommerce.ts` - Store connections
- `_social.ts` - Social accounts
- `_dunning.ts` - Payment retry
- `_revenue.ts` - Revenue tracking
- `_audit.ts` - Audit logs
- `todo.ts` - Todo items

---

## Part 2: Frontend Web Pages (Current → Complete)

### Current Routes (10 pages)
```
/                     → Home/dashboard
/ai                   → AI chat
/todos                → Todo list
/tickets/             → Ticket list
/tickets/:id          → Ticket detail
/kb/                  → Knowledgebase list
/kb/:slug             → Article view
/chat/                → Chat sessions
/admin/workflows/builder → Workflow builder
```

### Required Routes (40+ pages)

#### Agent Dashboard
| Route | Component | Purpose |
|-------|-----------|---------|
| `/dashboard` | `dashboard/index.tsx` | Main agent dashboard with stats |
| `/dashboard/tickets` | `dashboard/tickets.tsx` | Ticket overview widgets |
| `/dashboard/chat` | `dashboard/chat.tsx` | Chat queue |
| `/dashboard/reports` | `dashboard/reports-widget.tsx` | Quick reports |

#### Tickets Module
| Route | Component | Purpose |
|-------|-----------|---------|
| `/tickets/new` | `tickets/new.tsx` | Create ticket form |
| `/tickets/kanban` | `tickets/kanban.tsx` | Kanban board view |
| `/tickets/spam` | `tickets/spam.tsx` | Spam queue |
| `/tickets/merged` | `tickets/merged.tsx` | Merged tickets |
| `/tickets/:id/edit` | `tickets/[id]/edit.tsx` | Edit ticket |
| `/tickets/:id/merge` | `tickets/[id]/merge.tsx` | Merge dialog |
| `/tickets/:id/timeline` | `tickets/[id]/timeline.tsx` | Full timeline |
| `/tickets/:id/messages` | `tickets/[id]/messages.tsx` | Message thread |

#### Contacts Module
| Route | Component | Purpose |
|-------|-----------|---------|
| `/contacts` | `contacts/index.tsx` | Contact list |
| `/contacts/:id` | `contacts/[id].tsx` | Contact detail |
| `/contacts/new` | `contacts/new.tsx` | Create contact |
| `/contacts/import` | `contacts/import.tsx` | Bulk import |

#### Team Management
| Route | Component | Purpose |
|-------|-----------|---------|
| `/teams` | `teams/index.tsx` | Team list |
| `/teams/new` | `teams/new.tsx` | Create team |
| `/teams/:id` | `teams/[id].tsx` | Team detail |
| `/teams/:id/members` | `teams/[id]/members.tsx` | Team members |

#### Users & Roles
| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/users` | `admin/users/index.tsx` | User list |
| `/admin/users/invite` | `admin/users/invite.tsx` | Invite user |
| `/admin/users/:id` | `admin/users/[id].tsx` | User detail |
| `/admin/roles` | `admin/roles/index.tsx` | Role list |
| `/admin/roles/new` | `admin/roles/new.tsx` | Create role |
| `/admin/roles/:id` | `admin/roles/[id].tsx` | Edit role |
| `/admin/roles/:id/permissions` | `admin/roles/[id]/permissions.tsx` | Permission editor |

#### Mailboxes & Email
| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/mailboxes` | `admin/mailboxes/index.tsx` | Mailbox list |
| `/admin/mailboxes/new` | `admin/mailboxes/new.tsx` | Add mailbox |
| `/admin/mailboxes/:id` | `admin/mailboxes/[id].tsx` | Mailbox detail |
| `/admin/mailboxes/:id/configure` | `admin/mailboxes/[id]/configure.tsx` | IMAP/SMTP config |
| `/admin/mailboxes/:id/routing` | `admin/mailboxes/[id]/routing.tsx` | Routing rules |
| `/admin/email-templates` | `admin/email-templates/index.tsx` | Email templates |

#### Forms Module
| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/forms` | `admin/forms/index.tsx` | Form list |
| `/admin/forms/new` | `admin/forms/new.tsx` | Create form |
| `/admin/forms/builder` | `admin/forms/builder.tsx` | Drag-drop builder |
| `/admin/forms/:id` | `admin/forms/[id].tsx` | Form settings |
| `/admin/forms/:id/submissions` | `admin/forms/[id]/submissions.tsx` | View submissions |
| `/forms/:id` | `forms/[id].tsx` | Public form (customer-facing) |

#### Workflows Module
| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/workflows` | `admin/workflows/index.tsx` | Workflow list |
| `/admin/workflows/new` | `admin/workflows/new.tsx` | Create workflow |
| `/admin/workflows/builder` | `admin/workflows/builder.tsx` | Visual builder |
| `/admin/workflows/:id` | `admin/workflows/[id].tsx` | Workflow detail |
| `/admin/workflows/:id/logs` | `admin/workflows/[id]/logs.tsx` | Execution logs |

#### SLA & Saved Replies
| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/sla` | `admin/sla/index.tsx` | SLA policies |
| `/admin/sla/new` | `admin/sla/new.tsx` | Create SLA |
| `/admin/saved-replies` | `admin/saved-replies/index.tsx` | Saved replies |
| `/admin/saved-replies/folders` | `admin/saved-replies/folders.tsx` | Folder management |

#### Knowledgebase Module
| Route | Component | Purpose |
|-------|-----------|---------|
| `/kb/new` | `kb/new.tsx` | Create article |
| `/kb/categories` | `kb/categories/index.tsx` | Category list |
| `/kb/categories/:id` | `kb/categories/[id].tsx` | Category detail |
| `/kb/:slug/edit` | `kb/[slug]/edit.tsx` | Edit article |
| `/kb/search` | `kb/search.tsx` | Search results |

#### Chat Module
| Route | Component | Purpose |
|-------|-----------|---------|
| `/chat/active` | `chat/active.tsx` | Active sessions |
| `/chat/ended` | `chat/ended.tsx` | Chat history |
| `/chat/:id` | `chat/[id].tsx` | Chat conversation |
| `/admin/chat/widgets` | `admin/chat/widgets.tsx` | Widget configuration |

#### Reports Module
| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/reports` | `admin/reports/index.tsx` | Reports dashboard |
| `/admin/reports/tickets` | `admin/reports/tickets.tsx` | Ticket reports |
| `/admin/reports/agents` | `admin/reports/agents.tsx` | Agent performance |
| `/admin/reports/sla` | `admin/reports/sla.tsx` | SLA compliance |
| `/admin/reports/csat` | `admin/reports/csat.tsx` | CSAT scores |
| `/admin/reports/custom` | `admin/reports/custom.tsx` | Custom reports |

#### Billing Module
| Route | Component | Purpose |
|-------|-----------|---------|
| `/billing` | `billing/index.tsx` | Current plan |
| `/billing/upgrade` | `billing/upgrade.tsx` | Plan comparison |
| `/billing/invoices` | `billing/invoices.tsx` | Invoice history |
| `/billing/payment-methods` | `billing/payment-methods.tsx` | Payment methods |
| `/billing/seats` | `billing/seats.tsx` | Seat management |

#### Settings & Branding
| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/branding` | `admin/branding/index.tsx` | White-label settings |
| `/admin/branding/theme` | `admin/branding/theme.tsx` | Theme editor |
| `/admin/branding/email` | `admin/branding/email.tsx` | Email templates |
| `/admin/branding/portal` | `admin/branding/portal.tsx` | Portal customization |
| `/admin/security` | `admin/security/index.tsx` | Security settings |
| `/admin/security/sso` | `admin/security/sso.tsx` | SSO configuration |
| `/admin/security/ip-whitelist` | `admin/security/ip-whitelist.tsx` | IP whitelist |
| `/admin/settings` | `admin/settings/index.tsx` | General settings |
| `/admin/custom-domain` | `admin/custom-domain.tsx` | Domain config |

#### Social & eCommerce
| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/social` | `admin/social/index.tsx` | Social accounts |
| `/admin/social/facebook` | `admin/social/facebook.tsx` | Facebook config |
| `/admin/social/instagram` | `admin/social/instagram.tsx` | Instagram config |
| `/admin/social/twitter` | `admin/social/twitter.tsx` | Twitter config |
| `/admin/social/whatsapp` | `admin/social/whatsapp.tsx` | WhatsApp config |
| `/admin/ecommerce` | `admin/ecommerce/index.tsx` | Store list |
| `/admin/ecommerce/connect` | `admin/ecommerce/connect.tsx` | Connect store |
| `/admin/ecommerce/:id` | `admin/ecommerce/[id].tsx` | Store detail |

#### User Settings
| Route | Component | Purpose |
|-------|-----------|---------|
| `/settings/profile` | `settings/profile.tsx` | Profile settings |
| `/settings/password` | `settings/password.tsx` | Change password |
| `/settings/security` | `settings/security.tsx` | 2FA, sessions |
| `/settings/notifications` | `settings/notifications.tsx` | Notification prefs |
| `/settings/appearance` | `settings/appearance.tsx` | Theme, language |

---

## Part 3: Frontend Mobile Pages (Current → Complete)

### Current Mobile Screens (8 screens)
```
apps/native/app/
├── (drawer)/_layout.tsx    → Drawer navigation
├── (drawer)/index.tsx       → Home tab
├── (drawer)/two.tsx         → Secondary tab
├── (drawer)/ai.tsx          → AI chat
├── (drawer)/todos.tsx       → Todos
├── (drawer)/modal.tsx       → Modal
└── +not-found.tsx           → 404
```

### Required Mobile Screens (25+ screens)

#### Mobile: Ticket Module
| Screen | File | Purpose |
|--------|------|---------|
| Ticket List | `app/(drawer)/tickets/index.tsx` | List all tickets |
| Ticket Detail | `app/(drawer)/tickets/[id].tsx` | View ticket |
| Create Ticket | `app/(drawer)/tickets/new.tsx` | New ticket form |
| Ticket Replies | `app/(drawer)/tickets/[id]/replies.tsx` | Reply thread |
| Ticket Search | `app/(drawer)/tickets/search.tsx` | Search tickets |

#### Mobile: Chat Module
| Screen | File | Purpose |
|--------|------|---------|
| Chat List | `app/(drawer)/chat/index.tsx` | Active chats |
| Chat Conversation | `app/(drawer)/chat/[id].tsx` | Chat messages |
| Chat New | `app/(drawer)/chat/new.tsx` | Start chat |

#### Mobile: Knowledgebase
| Screen | File | Purpose |
|--------|------|---------|
| KB Home | `app/(drawer)/kb/index.tsx` | Categories |
| KB Category | `app/(drawer)/kb/[id].tsx` | Category articles |
| KB Article | `app/(drawer)/kb/article/[id].tsx` | Article view |
| KB Search | `app/(drawer)/kb/search.tsx` | Search |

#### Mobile: Contacts
| Screen | File | Purpose |
|--------|------|---------|
| Contact List | `app/(drawer)/contacts/index.tsx` | Contact list |
| Contact Detail | `app/(drawer)/contacts/[id].tsx` | Contact info |
| Contact Tickets | `app/(drawer)/contacts/[id]/tickets.tsx` | Contact history |

#### Mobile: Profile & Settings
| Screen | File | Purpose |
|--------|------|---------|
| Profile | `app/(drawer)/profile/index.tsx` | User profile |
| Settings | `app/(drawer)/settings/index.tsx` | App settings |
| Notifications | `app/(drawer)/settings/notifications.tsx` | Notif prefs |
| Security | `app/(drawer)/settings/security.tsx` | 2FA, password |

#### Mobile: Admin (if agent role)
| Screen | File | Purpose |
|--------|------|---------|
| Admin Dashboard | `app/(drawer)/admin/index.tsx` | Admin home |
| Team Management | `app/(drawer)/admin/teams.tsx` | Manage teams |
| User Management | `app/(drawer)/admin/users.tsx` | Manage users |

---

## Part 4: Backend API Endpoints

### Missing/Partial Routers to Complete

#### 1. emailMessages Router (NEW)
```typescript
// packages/api/src/routers/emailMessages.ts
- list(inbox, sent, draft)
- get(id)
- send(to, cc, bcc, subject, body)
- reply(ticketId, body)
- forward(ticketId, forwardTo)
- markSpam(id)
- markNotSpam(id)
- getAttachment(id)
- getThread(messageId)
```

#### 2. reports Router (NEW)
```typescript
// packages/api/src/routers/reports.ts
- getTicketVolume(params)
- getAgentPerformance(params)
- getSlaCompliance(params)
- getCsatTrends(params)
- getResponseTime(params)
- getResolutionRate(params)
- exportReport(type, format)
- getCustomReport(id)
- createCustomReport(config)
```

#### 3. ai Router (NEW)
```typescript
// packages/api/src/routers/ai.ts
- suggestReplies(ticketId)
- analyzeSentiment(text)
- predictPriority(ticketId)
- suggestRouting(ticketId)
- suggestArticles(query)
- generateDraft(ticketId)
- detectLanguage(text)
- summarize(ticketId)
```

#### 4. sessions Router (NEW)
```typescript
// packages/api/src/routers/sessions.ts
- list(userId)
- revoke(id)
- revokeAll(userId)
- getActive()
- extend(id)
```

#### 5. tasks Router (NEW)
```typescript
// packages/api/src/routers/tasks.ts
- list(params)
- get(id)
- create(data)
- update(id, data)
- delete(id)
- assign(taskId, userId)
- complete(taskId)
- addComment(taskId, comment)
- getSubtasks(parentId)
- createSubtask(parentId, data)
```

#### 6. Complete mailboxes Router
```typescript
// packages/api/src/routers/mailboxes.ts - ADD:
- update(id, data)
- delete(id)
- testConnection(id)
- configureImap(id, config)
- configureSmtp(id, config)
- syncNow(id)
- getStatistics(id)
- addAlias(mailboxId, alias)
- removeAlias(aliasId)
- createRoutingRule(mailboxId, rule)
- updateRoutingRule(ruleId, rule)
- deleteRoutingRule(ruleId)
```

#### 7. Complete chatSessions Router
```typescript
// packages/api/src/routers/chatSessions.ts - ADD:
- getActiveSessions(organizationId)
- getStats(organizationId, dateRange)
- sendTypingIndicator(sessionId, isTyping)
- sendReadReceipt(messageId)
```

#### 8. Complete ecommerceStores Router
```typescript
// packages/api/src/routers/ecommerceStores.ts - ADD:
- connectShopify(storeUrl, accessToken)
- connectWooCommerce(storeUrl, consumerKey, consumerSecret)
- connectSalla(storeUrl, accessToken)
- connectZid(storeUrl, accessToken)
- disconnect(storeId)
- syncNow(storeId)
- getSyncStatus(storeId)
- getOrders(storeId, params)
- searchOrders(query)
```

#### 9. Complete socialAccounts Router
```typescript
// packages/api/src/routers/socialAccounts.ts - ADD:
- connectFacebook(pageId, accessToken)
- connectInstagram(accountId, accessToken)
- connectTwitter(accountId, accessToken)
- connectWhatsApp(phoneNumberId, accessToken)
- disconnect(accountId)
- refreshToken(accountId)
- getStatus(accountId)
```

#### 10. Complete workflows Router
```typescript
// packages/api/src/routers/workflows.ts - ADD:
- execute(workflowId, ticketId)
- simulate(workflowId, testData)
- getExecutionLogs(workflowId, params)
- toggleActive(id, isActive)
```

---

## Part 5: Queue Workers

### Missing Workers (8 workers)

```typescript
// packages/queue/src/workers/index.ts

1. emailFetch.worker.ts
   - Poll IMAP servers at intervals
   - Parse incoming emails
   - Create tickets from emails
   - Handle threading (In-Reply-To)
   - Mark as spam if detected

2. emailSend.worker.ts
   - Send emails via SMTP
   - Template rendering
   - Track delivery status
   - Handle bounces

3. slaCheck.worker.ts
   - Check SLA timers every minute
   - Update breach status
   - Trigger escalations
   - Send warning notifications

4. csatSurvey.worker.ts
   - Send CSAT surveys on ticket close
   - Process survey responses
   - Generate reports

5. socialSync.worker.ts
   - Poll social media APIs
   - Create messages from social
   - Update message status
   - Handle webhooks

6. ecommerceSync.worker.ts
   - Sync order data periodically
   - Update order status
   - Link orders to contacts

7. workflowExecute.worker.ts
   - Execute workflow rules
   - Apply actions (assign, tag, notify)
   - Log execution results
   - Detect loops

8. notificationDelivery.worker.ts
   - Send push notifications
   - Send email digests
   - Send SMS (future)
```

---

## Part 6: UI Components Needed

### Shared Components (packages/ui/)
```
button.tsx, card.tsx, checkbox.tsx, input.tsx, label.tsx
skeleton.tsx, dropdown-menu.tsx, sonner.tsx (existing)

NEW:
├── data-table.tsx          → Generic data table
├── paginator.tsx          → Pagination controls
├── date-range-picker.tsx  → Date range selector
├── file-upload.tsx        → File upload zone
├── avatar.tsx             → User avatars
├── badge.tsx              → Status badges
├── tabs.tsx               → Tab navigation
├── modal.tsx              → Modal dialog
├── drawer.tsx             → Slide-out drawer
├── select.tsx             → Select dropdown
├── textarea.tsx            → Multi-line input
├── toggle.tsx             → Boolean toggle
├── switch.tsx             → Switch toggle
├── progress.tsx            → Progress bar
├── tooltip.tsx            → Tooltip
├── popover.tsx            → Popover
├── calendar.tsx            → Calendar picker
├── chart.tsx              → Chart wrapper
```

### Web-Specific Components (apps/web/src/components/)
```
EXISTING:
header.tsx, theme-provider.tsx, mode-toggle.tsx, loader.tsx
ticket-form.tsx, ticket-reply.tsx, ticket-note.tsx, sla-badge.tsx
channel-badge.tsx, kb-search.tsx, kb-feedback.tsx
saved-reply-picker.tsx, order-panel.tsx
plan-upgrade.tsx, seat-management.tsx

NEW BY MODULE:

tickets/
├── ticket-list.tsx        → Ticket list with filters
├── ticket-filters.tsx     → Filter panel
├── ticket-bulk-actions.tsx → Bulk action bar
├── ticket-assignee.tsx    → Assignee picker
├── ticket-status.tsx      → Status selector
├── ticket-priority.tsx    → Priority selector
├── ticket-channel.tsx     → Channel badge
├── ticket-attachments.tsx → Attachment list
├── ticket-timeline.tsx    → Activity timeline
├── ticket-merge-dialog.tsx → Merge dialog
├── ticket-lock-indicator.tsx → Lock status

chat/
├── chat-widget.tsx        → Live chat widget
├── chat-window.tsx        → Chat window
├── chat-message.tsx       → Message bubble
├── chat-input.tsx         → Message input
├── chat-typing-indicator.tsx → Typing animation
├── chat-rating.tsx        → Post-chat rating

kb/
├── kb-article-card.tsx    → Article preview
├── kb-category-card.tsx    → Category tile
├── kb-search.tsx          → Search component
├── kb-sidebar.tsx         → Navigation sidebar

forms/
├── form-field.tsx         → Dynamic form field
├── form-builder-canvas.tsx → Drag-drop canvas
├── form-field-palette.tsx → Field type palette
├── form-conditional.tsx    → Conditional logic
├── form-preview.tsx        → Live preview

workflows/
├── workflow-canvas.tsx     → Visual builder canvas
├── workflow-node.tsx       → Node component
├── workflow-trigger.tsx    → Trigger picker
├── workflow-condition.tsx  → Condition builder
├── workflow-action.tsx     → Action picker
├── workflow-log-item.tsx   → Log entry

reports/
├── chart-line.tsx         → Line chart
├── chart-bar.tsx           → Bar chart
├── chart-pie.tsx           → Pie chart
├── report-card.tsx         → Stat card
├── report-table.tsx        → Data table

billing/
├── plan-card.tsx          → Plan display
├── invoice-row.tsx         → Invoice item
├── payment-method-card.tsx → Saved card
├── seat-list.tsx           → User seat list

branding/
├── logo-upload.tsx         → Logo upload
├── color-picker.tsx        → Color selector
├── theme-preview.tsx       → Live preview
├── email-template-editor.tsx → WYSIWYG editor
```

---

## Part 7: Implementation Phases

### Phase 1: Core Completion (Weeks 1-4)

**Backend:**
- [ ] Complete `mailboxes.ts` router (all procedures)
- [ ] Create `emailMessages.ts` router
- [ ] Create `reports.ts` router
- [ ] Create `sessions.ts` router
- [ ] Create `tasks.ts` router
- [ ] Create `ai.ts` router

**Queue Workers:**
- [ ] `emailFetch.worker.ts`
- [ ] `emailSend.worker.ts`

**Frontend Web:**
- [ ] `/admin/mailboxes/*` - Mailbox management pages
- [ ] `/admin/email-templates/*` - Email template pages
- [ ] `/admin/users/*` - User management
- [ ] `/admin/roles/*` - Role management
- [ ] `/tickets/new` - Create ticket page

### Phase 2: Module Completion (Weeks 5-8)

**Queue Workers:**
- [ ] `slaCheck.worker.ts`
- [ ] `csatSurvey.worker.ts`
- [ ] `workflowExecute.worker.ts`

**Frontend Web:**
- [ ] `/admin/workflows/*` - Workflow pages (list, builder)
- [ ] `/admin/forms/*` - Form builder pages
- [ ] `/admin/sla/*` - SLA policy pages
- [ ] `/admin/saved-replies/*` - Saved reply pages
- [ ] `/admin/reports/*` - Reports dashboard
- [ ] `/billing/*` - Billing pages

### Phase 3: Integrations (Weeks 9-12)

**Queue Workers:**
- [ ] `socialSync.worker.ts`
- [ ] `ecommerceSync.worker.ts`
- [ ] `notificationDelivery.worker.ts`

**Frontend Web:**
- [ ] `/admin/social/*` - Social account pages
- [ ] `/admin/ecommerce/*` - eCommerce pages
- [ ] `/admin/branding/*` - White-label pages
- [ ] `/admin/security/*` - Security pages
- [ ] `/admin/custom-domain` - Domain config

**Frontend Mobile:**
- [ ] All ticket screens
- [ ] All chat screens
- [ ] All KB screens
- [ ] Settings screens

### Phase 4: Polish (Weeks 13-16)

- [ ] RTL/Arabic support
- [ ] Dark mode refinements
- [ ] Mobile responsiveness audit
- [ ] Performance optimization
- [ ] Security hardening

---

## Part 8: File Structure Summary

### New Frontend Web Pages (40+ files)
```
apps/web/src/routes/
├── dashboard/
│   └── index.tsx
├── tickets/
│   ├── new.tsx
│   └── kanban.tsx
├── contacts/
│   ├── index.tsx
│   ├── new.tsx
│   └── [id].tsx
├── admin/
│   ├── users/
│   │   ├── index.tsx
│   │   ├── invite.tsx
│   │   └── [id].tsx
│   ├── roles/
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── [id]/
│   │       ├── index.tsx
│   │       └── permissions.tsx
│   ├── mailboxes/
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── [id]/
│   │       ├── index.tsx
│   │       ├── configure.tsx
│   │       └── routing.tsx
│   ├── workflows/
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── [id]/
│   │       ├── index.tsx
│   │       └── logs.tsx
│   ├── forms/
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   ├── builder.tsx
│   │   └── [id]/
│   │       ├── index.tsx
│   │       └── submissions.tsx
│   ├── sla/
│   │   ├── index.tsx
│   │   └── new.tsx
│   ├── saved-replies/
│   │   ├── index.tsx
│   │   └── folders.tsx
│   ├── reports/
│   │   ├── index.tsx
│   │   ├── tickets.tsx
│   │   ├── agents.tsx
│   │   ├── sla.tsx
│   │   ├── csat.tsx
│   │   └── custom.tsx
│   ├── branding/
│   │   ├── index.tsx
│   │   ├── theme.tsx
│   │   ├── email.tsx
│   │   └── portal.tsx
│   ├── security/
│   │   ├── index.tsx
│   │   ├── sso.tsx
│   │   └── ip-whitelist.tsx
│   ├── social/
│   │   ├── index.tsx
│   │   ├── facebook.tsx
│   │   ├── instagram.tsx
│   │   ├── twitter.tsx
│   │   └── whatsapp.tsx
│   ├── ecommerce/
│   │   ├── index.tsx
│   │   ├── connect.tsx
│   │   └── [id].tsx
│   ├── chat/
│   │   └── widgets.tsx
│   ├── email-templates/
│   │   └── index.tsx
│   └── settings/
│       └── index.tsx
├── billing/
│   ├── index.tsx
│   ├── upgrade.tsx
│   ├── invoices.tsx
│   ├── payment-methods.tsx
│   └── seats.tsx
├── settings/
│   ├── profile.tsx
│   ├── password.tsx
│   ├── security.tsx
│   ├── notifications.tsx
│   └── appearance.tsx
├── kb/
│   ├── new.tsx
│   ├── categories/
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── [slug]/
│   │   └── edit.tsx
│   └── search.tsx
├── forms/
│   └── [id].tsx
├── chat/
│   ├── active.tsx
│   ├── ended.tsx
│   └── [id].tsx
└── admin/
    └── custom-domain.tsx
```

### New Backend API Routers (3 routers)
```
packages/api/src/routers/
├── emailMessages.ts    (NEW - 9 procedures)
├── reports.ts          (NEW - 10 procedures)
├── ai.ts               (NEW - 9 procedures)
```

### Complete Existing Routers (10 routers)
```
packages/api/src/routers/
├── mailboxes.ts        (add 10 procedures)
├── chatSessions.ts     (add 3 procedures)
├── chatMessages.ts     (add 2 procedures)
├── contacts.ts         (add 2 procedures)
├── ecommerceStores.ts  (add 8 procedures)
├── socialAccounts.ts   (add 7 procedures)
├── workflows.ts        (add 4 procedures)
├── savedReplies.ts     (add 3 procedures)
├── users.ts            (add 3 procedures)
├── tickets.ts          (add 2 procedures)
```

### New Queue Workers (8 workers)
```
packages/queue/src/workers/
├── email-fetch.worker.ts
├── email-send.worker.ts
├── sla-check.worker.ts
├── csat-survey.worker.ts
├── social-sync.worker.ts
├── ecommerce-sync.worker.ts
├── workflow-execute.worker.ts
└── notification-delivery.worker.ts
```

### New Mobile Screens (17 screens)
```
apps/native/app/(drawer)/
├── tickets/
│   ├── index.tsx
│   ├── [id].tsx
│   ├── new.tsx
│   ├── [id]/replies.tsx
│   └── search.tsx
├── chat/
│   ├── index.tsx
│   ├── [id].tsx
│   └── new.tsx
├── kb/
│   ├── index.tsx
│   ├── [id].tsx
│   ├── article/[id].tsx
│   └── search.tsx
├── contacts/
│   ├── index.tsx
│   ├── [id].tsx
│   └── [id]/tickets.tsx
├── profile/
│   └── index.tsx
├── settings/
│   ├── index.tsx
│   ├── notifications.tsx
│   └── security.tsx
└── admin/
    ├── index.tsx
    ├── teams.tsx
    └── users.tsx
```

---

## Part 9: Priority Matrix

| Priority | Items | Effort |
|----------|-------|--------|
| **P1 Critical** | emailFetch, emailSend, mailboxes router, inbox UI | High |
| **P1 Critical** | Ticket creation, ticket list, ticket detail | Medium |
| **P2 High** | Workflow builder, SLA policies, CSAT surveys | High |
| **P2 High** | User/Role management, team management | Medium |
| **P3 Medium** | Reports, billing, saved replies | Medium |
| **P4 Normal** | Social integrations, eCommerce, branding | High |
| **P5 Nice** | Mobile app completion, RTL, polish | High |

---

## Part 10: Open Questions

| Item | Question | Impact |
|------|----------|--------|
| Q1 | Is there a preferred S3 provider? | Storage config |
| Q2 | Will WhatsApp BSP account be provided? | WhatsApp integration |
| Q3 | Is Elasticsearch needed for search? | Search architecture |
| Q4 | Maximum concurrent chat sessions? | WebSocket scaling |
| Q5 | SAML or Passport for SSO? | Auth complexity |

---

**Estimated Total**: 24 weeks with 2-3 developers

**Next Action**: Begin Phase 1 with mailbox router completion and email workers.
