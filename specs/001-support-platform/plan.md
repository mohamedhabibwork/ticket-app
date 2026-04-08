# Implementation Plan: Unified Customer Support & Ticket Management Platform

**Branch**: `001-support-platform` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-support-platform/spec.md`, ERD-FINAL.md, BRD-FINAL.md

## Summary

Multi-tenant white-label SaaS platform consolidating customer communication from email, live chat, social media, web forms, and eCommerce channels with integrated billing (Stripe/PayTabs) and GCC VAT compliance. Built as a TypeScript monorepo with Hono + ORPC backend, React + Vite frontend, and PostgreSQL 16+ with Drizzle ORM.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Hono 4.x, ORPC 0.4.x, Drizzle ORM 0.45.x, React 19, TanStack Router, TailwindCSS v4, NativeWind  
**Storage**: PostgreSQL 16+ (primary DB), Redis (sessions, queues), S3-compatible object storage (attachments)  
**Testing**: Vitest (unit), Playwright (e2e), drizzle-kit (migration testing)  
**Target Platform**: Linux server (Cloudflare Workers / Node.js), Web browsers (Chrome, Firefox, Safari, Edge)  
**Project Type**: Multi-tenant SaaS web application (TypeScript monorepo)  
**Performance Goals**: API <300ms p95, 10,000+ concurrent agents, 99.9% uptime  
**Constraints**: <300ms p95 API response, Full RTL for Arabic, Multi-tenant row-level isolation, PCI DSS compliance (no raw card data)  
**Scale/Scope**: 10,000+ concurrent agents, 5-year data retention, 60+ database tables

## Constitution Check

**Status**: No gates — Constitution file (`.specify/memory/constitution.md`) is a template with no filled-in principles.

| Gate | Status | Notes |
|------|--------|-------|
| Architecture review | Not required | No constitution gates defined |
| Security review | Not required | No security gates defined |
| Performance review | Not required | No performance gates defined |

No violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-support-platform/
├── plan.md              # This file
├── spec.md             # Feature specification
├── data-model.md       # Drizzle schema (generated from main branch)
├── research.md          # Technology decisions (generated from main branch)
├── quickstart.md       # Dev setup guide (to be created)
├── contracts/          # OpenAPI specs (to be created)
│   ├── tickets.yaml
│   ├── users.yaml
│   ├── billing.yaml
│   └── webhooks.yaml
└── checklists/         # Implementation checklists
    └── requirements.md
```

### Source Code (repository root)

```text
apps/
├── server/                     # Hono + ORPC backend
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── router.ts           # ORPC router aggregation
│   │   └── routes/             # Route handlers
│   └── package.json
│
├── web/                        # React SPA frontend
│   ├── src/
│   │   ├── routes/             # TanStack Router routes
│   │   ├── components/         # Shared UI components
│   │   ├── pages/              # Route page components
│   │   ├── lib/                # Utilities and helpers
│   │   └── main.tsx           # Entry point
│   └── package.json
│
packages/
├── api/                        # ORPC routers (shared)
│   └── src/routers/
│       ├── tickets.ts
│       ├── contacts.ts
│       ├── users.ts
│       ├── billing.ts
│       └── ...
│
├── db/                         # Drizzle ORM schemas
│   └── src/schema/
│       ├── index.ts
│       ├── _lookups.ts
│       ├── _organizations.ts
│       ├── _users.ts
│       ├── _tickets.ts
│       ├── _mailboxes.ts
│       ├── _billing.ts
│       └── ... (per ERD module)
│
└── ... (future: email, chat, workflows, etc.)
```

**Structure Decision**: TypeScript monorepo with Turborepo. Backend in `apps/server` (Hono + ORPC), frontend in `apps/web` (React + Vite + TanStack Router), shared code in `packages/`.

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
1. **Database schema** — Complete Drizzle schema from ERD (60+ tables)
2. **Authentication** — Email/password, OAuth (Google), sessions, 2FA
3. **Organization & Multi-tenancy** — Row-level isolation via `organization_id`
4. **User & RBAC** — Roles, permissions, team management
5. **Core API infrastructure** — ORPC setup, middleware, error handling

### Phase 2: Ticket Core (Weeks 5-8)
1. **Ticket CRUD** — Create, read, update, delete tickets with reference numbers
2. **Ticket timeline** — Messages, notes, activity log
3. **Contacts** — Contact management, duplicate detection
4. **Tags & views** — Saved filtered views, bulk operations
5. **Attachments** — S3 storage, presigned URLs

### Phase 3: Channels (Weeks 9-12)
1. **Email integration** — IMAP/SMTP, Gmail OAuth, email threading
2. **Form builder** — Drag-and-drop, conditional logic, CAPTCHA
3. **Social media** — Facebook, Instagram, Twitter, WhatsApp OAuth
4. **Live chat (Binaka)** — WebSocket, pre-chat form, chat sessions

### Phase 4: Automation & Intelligence (Weeks 13-16)
1. **SLA policies** — Timer calculation, breach detection, escalation
2. **Workflow automation** — Rule engine with triggers/conditions/actions
3. **Knowledgebase** — Articles, categories, search, feedback
4. **Saved replies** — Folders, merge tags, usage tracking

### Phase 5: Billing (Weeks 17-20)
1. **Plans & subscriptions** — Free, Starter, Professional, Enterprise
2. **Seat management** — Real-time count, limit enforcement
3. **Invoices** — Auto-generation, sequential numbering, Arabic PDF
4. **Payments** — Stripe + PayTabs integration
5. **Tax & VAT** — GCC country rates, Arabic invoice formatting

### Phase 6: Polish & Launch (Weeks 21-24)
1. **White-label** — Custom domain, branding, RTL
2. **Reports** — Ticket volume, agent performance, CSAT, SLA compliance
3. **Observability** — Structured logs, metrics, distributed tracing
4. **Performance optimization** — Query tuning, caching, CDN
5. **Security hardening** — Audit logs, IP whitelist, SAML SSO

## Complexity Tracking

No constitution violations to justify.

## Open Questions (Needs Clarification)

| Item | Question | Impact |
|------|----------|--------|
| Q1 | Is there a preferred S3 provider (R2, S3, MinIO)? | Storage configuration |
| Q2 | Will WhatsApp BSP account be provided? | WhatsApp integration |
| Q3 | Should we implement SAML directly or via library (Passport)? | Auth complexity |
| Q4 | Is Elasticsearch needed for initial launch or PostgreSQL sufficient? | Search architecture |
| Q5 | What is the maximum expected concurrent chat sessions? | WebSocket scaling |
