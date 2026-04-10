# Research: Unified Customer Support & Ticket Management Platform

**Date**: 2026-04-08 | **Status**: Complete

---

## 1. Multi-Tenant Isolation Strategy

### Decision

Row-level isolation via `organization_id` column on all tenant-scoped tables. Organization-level data is filtered at the repository layer using a context-based query builder.

### Rationale

- Simpler than schema-per-tenant (PostgreSQL schema switching adds complexity)
- More maintainable than separate databases per tenant (operational overhead)
- Row-level security (RLS) can be added as defense-in-depth
- All queries in `packages/api` automatically filter by `context.organizationId`

### Alternatives Considered

| Alternative                              | Rejected Because                                                    |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Separate PostgreSQL databases per tenant | Operational overhead of 1000+ databases, complex backups            |
| Schema-per-tenant                        | Schema migrations multiply complexity, cross-org queries impossible |
| Row-level security (RLS) only            | Performance overhead on complex queries, added complexity           |

---

## 2. API Layer: ORPC vs tRPC

### Decision

**ORPC** with `@orpc/tanstack-query` for client, `@orpc/server` for Hono.

### Rationale

- Generates OpenAPI 3.1 specs automatically (tRPC cannot)
- First-class TanStack Query integration with typed invalidation
- Zod-native input/output validation with `@orpc/zod`
- Hono adapter via `@orpc/server/fetch`
- Supports server-side streaming with AI SDK

### Alternatives Considered

| Alternative   | Rejected Because                                         |
| ------------- | -------------------------------------------------------- |
| tRPC          | No OpenAPI generation, requires custom adapters for Hono |
| REST (manual) | No end-to-end type safety, high boilerplate              |
| GraphQL       | Overkill for this use case, schema stitching complexity  |

---

## 3. Database: Drizzle ORM vs Prisma

### Decision

**Drizzle ORM** 0.45.x with PostgreSQL.

### Rationale

- Lightweight: no schema inference, direct SQL-like syntax
- Type-safe: inferred types from schema, no separate `.prisma` generation step
- Migration-first: `drizzle-kit` generates SQL migrations from schema changes
- SQL-like: easier for backend devs coming from raw SQL
- BigInt support: native `bigint` type maps to JavaScript `bigint` (for monetary)

### Alternatives Considered

| Alternative | Rejected Because                                                             |
| ----------- | ---------------------------------------------------------------------------- |
| Prisma      | Heavy (300MB+ install), slow queries for complex relations, no native BigInt |
| Kysely      | No migration system, raw SQL required for everything                         |
| Raw `pg`    | No type safety, high error rate                                              |

---

## 4. Real-time: WebSockets vs Server-Sent Events

### Decision

**WebSockets** via Cloudflare Durable Objects or BullMQ-based queues with polling fallback.

### Rationale

- Binaka chat requires bidirectional real-time communication
- Chat widget connects via WebSocket for instant message delivery
- Server can push ticket updates to agents in real-time
- Fallback to SSE for simple notifications

### Alternatives Considered

| Alternative          | Rejected Because                                       |
| -------------------- | ------------------------------------------------------ |
| SSE only             | Cannot push from client to server, unsuitable for chat |
| Polling              | High server load, latency unacceptable for chat        |
| Firebase Realtime DB | External dependency, vendor lock-in                    |

---

## 5. Email Processing: IMAP Polling vs Webhooks

### Decision

**IMAP polling** every 2 minutes per mailbox + **webhook** support for inbound SMTP forwarding.

### Rationale

- IMAP is the standard for mailbox access (Gmail, Outlook, custom)
- Polling is reliable and simple to implement
- Webhook endpoint available for forward-to-mailbox pattern
- SpamAssassin integration via pre-processing pipeline

### Alternatives Considered

| Alternative           | Rejected Because                                              |
| --------------------- | ------------------------------------------------------------- |
| Webhook-only          | Requires mail server configuration, not all providers support |
| GraphQL subscriptions | IMAP doesn't push, would still need polling                   |

---

## 6. File Storage: S3-Compatible Object Storage

### Decision

**S3-compatible** storage (Cloudflare R2, AWS S3, MinIO) with presigned URLs for uploads/downloads.

### Rationale

- Attachments can be large (up to 50MB per plan)
- Direct browser uploads via presigned URLs (no server bottleneck)
- CDN-friendly for images (KB articles, chat attachments)
- R2 has no egress fees (cost-effective for MENA market)

### Alternatives Considered

| Alternative     | Rejected Because                               |
| --------------- | ---------------------------------------------- |
| Database BLOB   | Performance degrades >1MB, backup bloat        |
| NFS/shared disk | No horizontal scaling, single point of failure |

---

## 7. Payments: Stripe + PayTabs

### Decision

**Stripe** as primary gateway (global), **PayTabs** as MENA fallback (SA, UAE, EG, KW, BH, OM, QA).

### Rationale

- Stripe: global reach, excellent DX, 3D Secure support, webhook reliability
- PayTabs: dominant in GCC, supports MADA, SADAD, local payment methods
- Gateway abstraction allows adding others without code changes
- All card data tokenized (PCI DSS compliance)

### Integration Events

| Gateway | Events to Consume                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------- |
| Stripe  | `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` |
| PayTabs | `payment_response`, `refund_response`                                                                                   |

---

## 8. Authentication: Session + OAuth + SAML

### Decision

**Session-based auth** with bcrypt passwords + **OAuth 2.0** (Google, Microsoft) + **SAML 2.0** for Enterprise SSO.

### Rationale

- Sessions stored in Redis with 24h expiry (configurable)
- OAuth for modern SaaS (Google Workspace, Microsoft Entra)
- SAML for enterprise clients with existing identity providers
- 2FA via TOTP (Google Authenticator) + Email OTP
- API keys for programmatic access (with scopes + expiry)

### Alternatives Considered

| Alternative | Rejected Because                                    |
| ----------- | --------------------------------------------------- |
| JWT only    | No server-side revocation, token refresh complexity |
| NextAuth    | Framework-specific, adds coupling                   |

---

## 9. Billing: Seat-Based Metering

### Decision

Seat count = active users (`is_active = true AND deleted_at IS NULL`) at billing time. Snapshot taken on invoice generation.

### Rationale

- Real-time seat count visible in dashboard
- Hard limit enforced on user creation (upgrade prompt)
- Seat add-ons increase effective limit immediately
- Mid-cycle seat changes prorated on next invoice

### Alternatives Considered

| Alternative                  | Rejected Because                             |
| ---------------------------- | -------------------------------------------- |
| End-of-cycle snapshot        | Admin cannot see current usage until billing |
| Unlimited seats with overage | Complex billing, unexpected charges          |

---

## 10. i18n: Arabic + English (RTL/LTR)

### Decision

**Arabic (ar)** and **English (en)** with RTL support. Agent dashboard is English-first with Arabic locale option. Customer portal is fully RTL-capable.

### Rationale

- BRD explicitly requires Arabic/English bilingual support
- Customer-facing portal (KB, email templates, chat) needs full RTL
- Agent dashboard is English-first (professional use)
- `next-themes` for locale/direction switching
- CSS logical properties (`margin-inline-start`) for RTL compatibility

### Implementation Notes

- `dir="rtl"` on `<html>` when `locale === 'ar'`
- TailwindCSS RTL via `rtl:` variant
- date-fns with locale support for Arabic date formatting
- ICU message format for pluralization/gender

---

## 11. PDF Generation: Arabic Invoices

### Decision

**@react-pdf/renderer** for React-based PDF generation with custom Arabic font support (Noto Sans Arabic).

### Rationale

- Server-side rendering with React components
- RTL layout support for Arabic
- Custom fonts embedded in PDF
- Template-driven (easy to modify)

### Alternatives Considered

| Alternative        | Rejected Because                          |
| ------------------ | ----------------------------------------- |
| puppeteer          | Heavy, complex Arabic font embedding      |
| wkhtmltopdf        | No React integration, poor Arabic support |
| Commercial service | Cost, external dependency                 |

---

## 12. Workflow Engine: Custom Rule Engine

### Decision

Custom JSON-based rule engine: `trigger` + `conditions[]` + `actions[]`. Rules stored as JSONB, evaluated in TypeScript.

### Rationale

- BRD requires specific trigger types (ticket created, SLA breached, etc.)
- JSONB allows dynamic conditions without schema changes
- Loop prevention via execution tracking table
- Extensible actions (add more without migrations)

### Rule Structure

```typescript
interface Workflow {
  trigger: 'ticket.created' | 'ticket.updated' | 'sla.breached' | ...
  conditionLogic: 'AND' | 'OR'
  conditions: Condition[]
  actions: Action[]
  stopProcessing: boolean
}
```

---

## 13. Social Media: Platform APIs

### Decision

| Platform  | Auth        | Implementation                            |
| --------- | ----------- | ----------------------------------------- |
| Facebook  | OAuth 2.0   | Graph API for Pages, Messenger, Instagram |
| Instagram | OAuth 2.0   | Graph API (same as Facebook)              |
| Twitter/X | OAuth 2.0   | Twitter API v2                            |
| WhatsApp  | BSP Account | WhatsApp Business API (Meta)              |

### Rationale

- All use OAuth 2.0 (secure, user-revocable)
- Tokens stored encrypted (AES-256)
- Rate limiting handled via queuing
- WhatsApp requires Meta-approved BSP (business service provider)

---

## 14. eCommerce: Platform Integrations

### Decision

| Platform    | Auth            | Data Retrieved              |
| ----------- | --------------- | --------------------------- |
| Shopify     | API Key + OAuth | Orders, products, customers |
| WooCommerce | REST API Key    | Orders, products, customers |
| Salla       | OAuth 2.0       | Orders (Saudi market)       |
| Zid         | OAuth 2.0       | Orders (Saudi market)       |

### Rationale

- OAuth when available (Salla, Zid) for better security
- API keys for self-hosted (WooCommerce)
- Order sync every 15 minutes + manual refresh
- All platform actions gated by permissions

---

## 15. SLA Timer Calculation

### Decision

SLA timers calculated on ticket create/update, stored as absolute `due_at` timestamps. Paused when ticket status is "Pending" or "On Hold".

### Rationale

- Absolute timestamps avoid drift and simplify breach detection
- Business hours calculated via `business_hours_config` JSON
- Holidays from `holidays` JSON array
- `paused_duration_minutes` accumulated when paused

### Timer States

```
running → paused → running
  ↓         ↓
breached  breached
```

---

## 16. Search: Full-Text Search

### Decision

PostgreSQL `tsvector` columns with `GIN` indexes for KB articles and ticket search. Future: Elasticsearch for advanced features.

### Rationale

- PostgreSQL native: no external service needed for MVP
- `tsvector` supports stemming, ranking, multilingual
- KB articles and ticket subjects/descriptions searchable
- Can migrate to Elasticsearch later if needed

---

## 17. Queue: BullMQ for Background Jobs

### Decision

**BullMQ** with Redis for: email processing, workflow execution, Slack notifications, eCommerce sync, PDF generation.

### Rationale

- Reliable job processing with retries
- Priority queues for SLA breaches
- Delayed jobs for dunning schedule
- Redis already in stack for sessions

### Queue Names

| Queue                | Purpose                    |
| -------------------- | -------------------------- |
| `email:process`      | Inbound email parsing      |
| `email:send`         | Outbound email delivery    |
| `workflow:execute`   | Workflow rule evaluation   |
| `chat:relay`         | WebSocket message delivery |
| `ecommerce:sync`     | Store data synchronization |
| `billing:invoice`    | Invoice generation         |
| `notification:email` | Templated email sending    |

---

## 18. Webhook Reliability

### Decision

Webhook processing via idempotent queue. Duplicate detection via `idempotency_key` in `workflow_execution_logs`.

### Rationale

- At-least-once delivery guaranteed by queue
- Idempotency keys prevent duplicate processing
- Failed webhooks retried with exponential backoff
- Execution logs for debugging

---

## Open Questions (Needs Clarification)

| Item | Question                                                             | Impact                |
| ---- | -------------------------------------------------------------------- | --------------------- |
| Q1   | Is there a preferred S3 provider (R2, S3, MinIO)?                    | Storage configuration |
| Q2   | Will WhatsApp BSP account be provided?                               | WhatsApp integration  |
| Q3   | Should we implement SAML directly or via library (Passport)?         | Auth complexity       |
| Q4   | Is Elasticsearch needed for initial launch or PostgreSQL sufficient? | Search architecture   |
| Q5   | What is the maximum expected concurrent chat sessions?               | WebSocket scaling     |
