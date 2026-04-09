# Implementation Plan: UVDesk Upgrade - Feature Parity

**Branch**: `upgrade/uvdesk-parity` | **Date**: 2026-04-09 | **Spec**: `UPGRADE-UVDESK.md`
**Input**: Feature gap analysis from `UPGRADE-UVDESK.md` (22 items: 10 Partial + 12 New)

## Summary

Implement full UVDesk Open Source feature parity plus AI-powered enhancements. The platform currently has 52/74 features covered; this upgrade addresses the remaining 22 items across 4 priority sprints. New capabilities include: Groups (department hierarchy), Ticket Categories with SLA routing, Agent visibility scopes, Thread-level locking, Ticket forwarding, Image gallery viewer, Concurrent ticket viewers (WebSocket presence), GDPR workflow, End-customer portal SSO, Machine translation, Google Calendar integration, Disqus/Amazon Seller Central integrations, Mobile SDK push notifications, AI chatbot, and On-Premise licensing.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: Hono 4.x, ORPC 0.4.x, Drizzle ORM 0.45.x, React 19, TanStack Router, TailwindCSS v4, BullMQ, Redis, PostgreSQL 16+, AI SDK (Google Gemini)  
**Storage**: PostgreSQL 16+ (primary), Redis (sessions/queues/caching), S3-compatible object storage  
**Testing**: Bun test framework (to be determined)  
**Target Platform**: Linux server (Cloudflare Workers / Bun runtime), Web SPA, React Native mobile  
**Project Type**: Multi-tenant SaaS customer support platform  
**Performance Goals**: <200ms API p95, real-time WebSocket presence, 10k concurrent ticket viewers  
**Constraints**: Multi-tenant isolation, GDPR compliance, Arabic RTL support, 30-day SLA for GDPR requests  
**Scale/Scope**: 22 new features across 4 sprints, 19 new database tables, 5 column additions to existing tables, 13+ new permission keys

## Constitution Check

*No constitution rules defined — template empty. Treating as PASS.*

## Project Structure

### Documentation (this feature)

```text
specs/001-support-platform/
├── spec.md              # Feature specification (from previous phase)
├── plan.md              # Implementation plan (from previous phase)
├── research.md          # Technology decisions (from previous phase)
├── data-model.md        # Drizzle schema (from previous phase)
├── quickstart.md        # Dev setup guide (from previous phase)
└── contracts/           # OpenAPI specs (from previous phase)

UPGRADE-UVDESK.md        # Gap analysis (input document)
specs/upgrade-uvdesk/    # Upgrade-specific artifacts (this plan)
├── plan.md              # This file
├── research.md          # Phase 0: Research decisions
├── data-model.md        # Phase 1: New schema objects
└── tasks.md             # Phase 2: Task breakdown
```

### Source Code (repository root)

```text
apps/
├── server/                     # Hono + ORPC backend
│   └── src/routes/             # Route handlers
├── web/                        # React SPA frontend
│   ├── src/routes/             # TanStack Router routes
│   └── src/components/        # Shared UI components
├── native/                     # React Native mobile
│   ├── app/                    # Expo Router screens
│   └── components/            # Mobile components
packages/
├── api/                        # ORPC routers (shared)
│   └── src/routers/           # tickets, contacts, users, billing, etc.
├── db/                         # Drizzle ORM schemas
│   └── src/schema/            # _tickets, _organizations, etc.
├── queue/                      # BullMQ workers
│   └── src/workers/           # email-fetch, sla-check, etc.
└── ui/                         # Shared UI components
```

**Structure Decision**: TypeScript monorepo with Turborepo. Backend (Hono + ORPC), Frontend (React + TanStack Router), Mobile (Expo Router), shared packages (api, db, queue, ui).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| WebSocket presence system | Real-time concurrent ticket viewers requires pub/sub | Polling insufficient for UX quality |
| 19 new database tables | UVDesk parity requires structured entities | Simpler key-value insufficient for compliance/audit |
| AI chatbot layer | Market differentiation, UVDesk AI Chatbot parity | Manual-only insufficient at scale |

---

## Phase 0: Research

### Unknowns to Resolve

1. **WebSocket provider**: Bun/Hono native WebSocket vs Socket.io vs Cloudflare Durable Objects for presence
2. **Translation API**: Google Translate vs DeepL vs Azure Translator pricing/quality for MENA market
3. **Amazon SP-API**: Best library for seller central messaging integration
4. **Push notification service**: FCM/APNs direct vs OneSignal vs Supabase Edge Functions
5. **On-premise license verification**: JWT-based vs callback-home (data sovereignty requirement)
6. **AI chatbot LLM selection**: OpenAI GPT-4o vs Claude vs Azure OpenAI for knowledgebase RAG

### Research Tasks

| # | Topic | Decision Needed |
|---|-------|----------------|
| 1 | Real-time presence architecture | WebSocket provider for ticket viewer presence |
| 2 | Machine translation provider | Google Translate vs DeepL for ticket messages |
| 3 | Amazon SP-API integration | Library choice for seller central messaging |
| 4 | Mobile push notifications | FCM/APNs vs third-party service |
| 5 | On-premise license enforcement | Local-only JWT verification pattern |
| 6 | AI chatbot knowledgebase RAG | Embedding provider + retrieval strategy |
| 7 | Disqus API integration | API v3 endpoints and rate limits |

---

## Phase 1: Design & Contracts

### New Database Tables (19)

| Table | Purpose | File |
|-------|---------|------|
| `ticket_categories` | Structured ticket types with SLA/team/priority overrides | `_tickets.ts` |
| `groups` | Department-level grouping above teams | `_teams.ts` (new file) |
| `ticket_forwards` | Explicit ticket forwarding action records | `_tickets.ts` |
| `disqus_accounts` | Disqus forum connections | `_social.ts` |
| `marketplace_accounts` | Amazon Seller Central / eBay connections | `_ecommerce.ts` |
| `marketplace_messages` | Inbound/outbound marketplace buyer-seller messages | `_ecommerce.ts` |
| `agent_calendar_connections` | Google Calendar OAuth per agent | `_users.ts` |
| `ticket_calendar_events` | Events created from tickets/tasks in Google Calendar | `_tasks.ts` |
| `gdpr_requests` | GDPR data subject request tracking | `_audit.ts` |
| `customer_social_identities` | Social login (Google/Facebook/Apple) for end-customers | `_contacts.ts` |
| `customer_sessions` | Customer portal session tokens | `_contacts.ts` |
| `translation_configs` | Per-org machine translation provider config | `_organizations.ts` |
| `translation_cache` | Ephemeral translation result cache | `_organizations.ts` |
| `mobile_sdk_configs` | Mobile SDK configuration and FCM/APNs keys | `_organizations.ts` |
| `contact_push_tokens` | Device push tokens per contact | `_contacts.ts` |
| `push_notification_logs` | Push delivery records | `_channels.ts` |
| `chatbot_configs` | AI chatbot configuration per org | `_organizations.ts` |
| `chatbot_sessions` | Chatbot conversation sessions | `_chat.ts` |
| `chatbot_messages` | Individual chatbot message turns | `_chat.ts` |
| `on_premise_licenses` | License records for self-hosted deployments | `_organizations.ts` |

### Columns Added to Existing Tables (5 tables)

| Table | New Column(s) | Notes |
|-------|---------------|-------|
| `tickets` | `category_id`, `assigned_group_id` | FK to new tables |
| `ticket_messages` | `is_thread_locked`, `thread_locked_by`, `thread_locked_at`, `thread_unlocked_by`, `thread_unlocked_at`, `deleted_reason` | Thread-level locking + omission audit |
| `ticket_attachments` | `is_inline_image`, `image_width`, `image_height`, `thumbnail_key`, `gallery_order` | Image gallery metadata |
| `teams` | `group_id` | FK to new groups table |
| `roles` | `ticket_view_scope` | `'all' \| 'group' \| 'self'` |

### New Permission Keys (13)

```
tickets.view_scope.all / tickets.view_scope.group / tickets.view_scope.self
threads.lock / threads.unlock / threads.view_locked / threads.delete / threads.view_deleted
gdpr.requests.manage
marketplace.view / marketplace.reply
chatbot.configure
translation.use
calendar.connect
```

### New API Routers

| Router | Purpose |
|--------|---------|
| `groups.ts` | Department-level group CRUD |
| `ticketCategories.ts` | Ticket type/category management |
| `ticketForwards.ts` | Ticket forwarding action logging |
| `disqus.ts` | Disqus integration |
| `marketplace.ts` | Amazon Seller Central / marketplace messaging |
| `calendar.ts` | Google Calendar integration |
| `gdpr.ts` | GDPR data subject request workflow |
| `customerAuth.ts` | End-customer portal SSO |
| `translation.ts` | Machine translation service |
| `mobileSdk.ts` | Mobile SDK configuration |
| `chatbot.ts` | AI chatbot configuration and sessions |
| `presence.ts` | WebSocket presence management |
| `onPremise.ts` | On-premise license management |

### New Queue Workers

| Worker | Purpose | Trigger |
|--------|---------|---------|
| `gdpr-sl老了-check.worker.ts` | GDPR request SLA monitoring | Daily cron |
| `amazon-sync.worker.ts` | Amazon seller central message sync | Scheduled |
| `disqus-sync.worker.ts` | Disqus comment ingestion | Scheduled |
| `push-notification.worker.ts` | FCM/APNs delivery | Event-driven |
| `chatbot-escalation.worker.ts` | Bot confidence threshold check | Event-driven |
| `license-verification.worker.ts` | On-premise license daily check | Daily cron |

---

## Phase 2: Implementation by Sprint

### Sprint 1 (P1 - Core Infrastructure)

| # | Feature | Files Changed |
|---|---------|---------------|
| 1 | Groups (department level) | `db/schema/_teams.ts`, `api/routers/groups.ts`, web pages, mobile screens |
| 2 | Ticket Categories with SLA override | `db/schema/_tickets.ts`, `api/routers/ticketCategories.ts`, web pages |
| 3 | Agent visibility scopes | `db/schema/_users.ts`, `api/routers/roles.ts`, ticket list query updates |
| 4 | Thread-level locking | `db/schema/_tickets.ts`, `api/routers/ticketMessages.ts`, web UI |
| 5 | Thread omission audit | Same as above + audit log extension |

### Sprint 2 (P2 - Agent Experience)

| # | Feature | Files Changed |
|---|---------|---------------|
| 6 | Concurrent ticket viewer presence | `api/routers/presence.ts`, WebSocket handler, Redis pub/sub |
| 7 | Ticket forwarding as explicit action | `db/schema/_tickets.ts`, `api/routers/ticketForwards.ts`, web UI |
| 8 | Image gallery viewer in ticket | `db/schema/_tickets.ts`, web component, lightbox UI |
| 9 | GDPR data subject request workflow | `db/schema/_audit.ts`, `api/routers/gdpr.ts`, admin UI, queue worker |
| 10 | End-customer portal SSO | `db/schema/_contacts.ts`, `api/routers/customerAuth.ts`, `social.ts` router |

### Sprint 3 (P3 - Integrations)

| # | Feature | Files Changed |
|---|---------|---------------|
| 11 | Ticket translation (machine) | `db/schema/_organizations.ts`, `api/routers/translation.ts`, translate UI |
| 12 | Google Calendar integration | `db/schema/_users.ts`, `api/routers/calendar.ts`, event creation UI |
| 13 | Disqus integration | `db/schema/_social.ts`, `api/routers/disqus.ts`, queue worker, web UI |
| 14 | Amazon Seller Central Messaging | `db/schema/_ecommerce.ts`, `api/routers/marketplace.ts`, queue worker |

### Sprint 4 (P4 - Mobile & AI)

| # | Feature | Files Changed |
|---|---------|---------------|
| 15 | Mobile SDK & Push Notifications | `db/schema/_organizations.ts`, `api/routers/mobileSdk.ts`, push worker, SDK docs |
| 16 | AI Chatbot | `db/schema/_organizations.ts`, `db/schema/_chat.ts`, `api/routers/chatbot.ts`, web UI |
| 17 | On-Premise / Self-Hosted Edition | `db/schema/_organizations.ts`, `api/routers/onPremise.ts`, Docker Compose, license verification |

---

## Priority Roadmap Summary

| Sprint | Features | Effort | Impact |
|--------|----------|--------|--------|
| P1 | Groups, Ticket Categories, Agent Scopes, Thread Locking, Thread Omission | Medium-High | High |
| P2 | Presence, Forwarding, Gallery, GDPR, Customer SSO | Medium | High |
| P3 | Translation, Calendar, Disqus, Amazon Seller | Medium | Medium |
| P4 | Mobile SDK, AI Chatbot, On-Premise | High | High |

---

## Output Artifacts

After Phase 1 completion:
- `specs/upgrade-uvdesk/research.md` - Technology decisions for unknowns
- `specs/upgrade-uvdesk/data-model.md` - Complete Drizzle schema additions
- `packages/db/src/schema/upgrade-uvdesk/` - New schema files
- Agent context updated via `.specify/scripts/powershell/update-agent-context.ps1`
