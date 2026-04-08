# Implementation Plan: Unified Customer Support & Ticket Management Platform

**Branch**: `main` | **Date**: 2026-04-08 | **Spec**: BRD-FINAL.md, ERD-FINAL.md
**Input**: Complete BRD (v2.0.0) and ERD (v2.0.0) documents

## Summary

Build a **multi-tenant white-label SaaS customer support platform** consolidating email, live chat, social media, web forms, and eCommerce channels into a single workspace, with integrated billing (Stripe/PayTabs) and GCC VAT compliance.

**Technical Approach**: TypeScript monorepo (turborepo) with PostgreSQL 16+, Hono API server with ORPC, React web dashboard, Drizzle ORM for type-safe database access, and AI SDK for automation.

---

## Technical Context

| Field | Value |
|-------|-------|
| **Language/Version** | TypeScript 5.x |
| **Primary Dependencies** | Hono 4.x, ORPC 1.x, Drizzle ORM 0.45.x, React 19.x, TanStack Router/Query, TailwindCSS v4, AI SDK 6.x |
| **Storage** | PostgreSQL 16+ (database), Redis (sessions/queue), S3-compatible (attachments) |
| **Testing** | Vitest (unit), Playwright (e2e), drizzle-kit (migrations) |
| **Target Platform** | Web (responsive SPA), Mobile-native (Expo - future) |
| **Project Type** | Multi-tenant SaaS Web Application |
| **Performance Goals** | API <300ms p95, PDF generation <3s, billing portal <500ms |
| **Constraints** | Multi-tenancy via `organization_id`, PCI-compliant (no raw card data), full audit logging |
| **Scale/Scope** | 10k+ concurrent agents, horizontal scaling, 50+ database tables |

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Multi-tenant Isolation | ✅ PASS | All tables include `organization_id` with row-level security |
| Type Safety | ✅ PASS | ORPC + Drizzle ORM + Zod provide end-to-end type safety |
| API-First | ✅ PASS | All features exposed via ORPC RPC + OpenAPI |
| Schema as Source of Truth | ✅ PASS | Drizzle schema is the authoritative source |
| Billing Precision | ✅ PASS | All monetary amounts stored as BIGINT in smallest unit |
| Audit Logging | ✅ PASS | `created_by`, `updated_by`, `deleted_by` on all primary entities |
| Soft Deletes | ✅ PASS | `deleted_at` column on all primary entities |

**No violations requiring justification.**

---

## Project Structure

### Documentation (this feature)

```
specs/main/
├── plan.md              # This file
├── research.md          # Phase 0 output (integration patterns, technology decisions)
├── data-model.md        # Phase 1 output (Drizzle schema from ERD)
├── quickstart.md        # Phase 1 output (setup instructions)
└── contracts/           # Phase 1 output (API contract schemas)
    ├── tickets.yaml
    ├── users.yaml
    ├── billing.yaml
    └── webhooks.yaml
```

### Source Code (repository root)

```
ticket-app/
├── apps/
│   ├── server/          # Hono API server + ORPC
│   │   └── src/
│   │       ├── index.ts        # Entry point
│   │       └── routes/         # API route handlers
│   ├── web/             # React SPA (agent dashboard + customer portal)
│   │   └── src/
│   │       ├── routes/         # TanStack Router routes
│   │       ├── components/     # Shared UI components
│   │       ├── pages/          # Route pages
│   │       └── lib/            # Utilities
│   ├── native/          # Expo mobile app (future)
│   └── desktop/         # Tauri desktop app (future)
│
├── packages/
│   ├── api/             # ORPC routers + procedures
│   │   └── src/
│   │       ├── routers/         # Feature routers
│   │       │   ├── tickets.ts
│   │       │   ├── users.ts
│   │       │   ├── contacts.ts
│   │       │   ├── mailboxes.ts
│   │       │   ├── forms.ts
│   │       │   ├── workflows.ts
│   │       │   ├── knowledgebase.ts
│   │       │   ├── billing.ts
│   │       │   └── admin.ts
│   │       └── context.ts       # Auth context
│   │
│   ├── db/              # Drizzle ORM schemas (ERD implementation)
│   │   └── src/
│   │       ├── schema/
│   │       │   ├── index.ts          # Re-exports
│   │       │   ├── _lookups.ts       # Lookup system
│   │       │   ├── _organizations.ts # Tenants + branding
│   │       │   ├── _users.ts         # Users, roles, permissions, teams
│   │       │   ├── _contacts.ts       # Contacts + notes
│   │       │   ├── _mailboxes.ts      # Email + IMAP/SMTP
│   │       │   ├── _tickets.ts        # Tickets + messages + attachments
│   │       │   ├── _sla.ts            # SLA policies + breaches
│   │       │   ├── _forms.ts          # Form builder
│   │       │   ├── _workflows.ts      # Automation rules
│   │       │   ├── _social.ts         # Social media integrations
│   │       │   ├── _knowledgebase.ts  # KB articles + categories
│   │       │   ├── _chat.ts           # Binaka live chat
│   │       │   ├── _ecommerce.ts      # eCommerce integrations
│   │       │   ├── _billing.ts        # Plans, subscriptions, invoices
│   │       │   ├── _payments.ts        # Payment methods + gateways
│   │       │   └── _audit.ts           # Audit logs + notifications
│   │       ├── index.ts
│   │       └── migrations/      # Drizzle migrations
│   │
│   ├── ui/               # Shared React components (HeroUI/Shadcn)
│   ├── env/              # Environment schema validation (Zod)
│   ├── config/           # Shared ESLint/TypeScript config
│   └── infra/            # Deployment (Cloudflare Workers)
│
└── SPECS.md              # Architecture decision records
```

### Structure Decision

**Selected: Turborepo monorepo** with the following apps and packages:
- `apps/server` - Hono API server (Cloudflare Workers compatible)
- `apps/web` - React SPA (Vite + TanStack Router)
- `packages/api` - ORPC routers (shared between server and web)
- `packages/db` - Drizzle ORM schemas (source of truth for database)
- `packages/ui` - Shared component library
- `packages/env` - Zod-validated environment variables
- `packages/infra` - Deployment configuration

---

## Complexity Tracking

No complexity violations. The project requires all components listed above to deliver the full BRD scope.

---

## Implementation Phases

### Phase 1: Core Foundation (Weeks 1-4)

1. **Database Schema** (`packages/db`)
   - Implement all 50+ tables from ERD-FINAL.md
   - Drizzle migrations with proper versioning
   - Seed data for lookup types

2. **Auth & RBAC** (`packages/api/auth`)
   - Session-based auth with bcrypt
   - OAuth 2.0 (Google, Microsoft)
   - Role-Permission system
   - 2FA (TOTP + Email OTP)

3. **Organization & Branding** (`packages/api/org`)
   - Multi-tenant CRUD
   - Branding config management
   - Theme preferences

### Phase 2: Ticket System (Weeks 5-8)

4. **Tickets & Messages**
   - Ticket CRUD with reference numbers
   - Message threading (email, reply, note, activity)
   - Attachments (S3 storage)
   - Tags, CC, followers
   - Ticket locking

5. **SLA Management**
   - SLA policies with business hours
   - Timer calculation with pause/resume
   - Breach detection + escalation

6. **Custom Fields & Views**
   - Dynamic field types
   - Saved filtered views

### Phase 3: Channels (Weeks 9-12)

7. **Email Integration**
   - IMAP/SMTP mailbox management
   - Email parsing + threading
   - Auto-reply templates
   - Spam detection

8. **Form Builder**
   - Drag-and-drop builder
   - Conditional logic
   - reCAPTCHA/hCaptcha
   - Embed snippet generation

9. **Workflow Automation**
   - Rule engine (trigger → condition → action)
   - Loop prevention
   - Execution logging

### Phase 4: Extended Features (Weeks 13-16)

10. **Knowledgebase**
    - Article editor (WYSIWYG)
    - Categories + multi-language
    - Search + feedback

11. **Saved Replies**
    - Folder organization
    - Merge tags
    - Usage tracking

12. **Social Media**
    - Facebook/Instagram/WhatsApp Business
    - Twitter/X integration
    - Unified inbox

### Phase 5: Chat & eCommerce (Weeks 17-20)

13. **Binaka Live Chat**
    - WebSocket sessions
    - Pre-chat form
    - Real-time messaging
    - Auto-ticket conversion

14. **eCommerce Integrations**
    - Shopify, WooCommerce, Salla, Zid
    - Order panel in ticket
    - Refund/cancel actions

### Phase 6: Billing (Weeks 21-26)

15. **Subscription Engine**
    - Plan management (Free/Starter/Pro/Enterprise)
    - Seat metering
    - Add-ons

16. **Invoicing**
    - Auto-generation
    - Arabic PDF (RTL)
    - VAT calculation

17. **Payments**
    - Stripe integration
    - PayTabs (MENA)
    - Payment method tokens

18. **Dunning & Notifications**
    - Retry schedule
    - Grace period
    - Email templates

---

## Key Architecture Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| ORPC for API | Type-safe end-to-end, OpenAPI generation, TanStack Query integration | tRPC (no OpenAPI), REST (no type safety) |
| Drizzle ORM | Type-safe SQL, lightweight, migratable | Prisma (heavy), Kysely (no migrations) |
| Hono server | Edge-ready, lightweight, Cloudflare compatible | Express (no edge), Fastify (heavier) |
| BIGINT for money | Precision for SAR/AED currencies, no floating point | DECIMAL (not portable), INTEGER (precision loss) |
| organization_id partitioning | Simple, effective tenant isolation at query level | Row-level security (complex), separate schemas (migration hell) |

---

## Verification Gates

| Gate | Criteria | Checkpoint |
|------|----------|------------|
| Schema | All ERD tables implemented, migrations run | `bun db:push` succeeds |
| Auth | Login, logout, session expiry work | Playwright test |
| Multi-tenancy | Users cannot access other orgs | Integration test |
| API | All procedures type-check | `turbo check-types` |
| Billing | Stripe webhook processes correctly | Manual test + logs |
