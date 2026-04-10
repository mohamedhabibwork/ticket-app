# Quickstart: Unified Customer Support & Ticket Management Platform

**Date**: 2026-04-08 | **Status**: Draft

---

## Prerequisites

- **Node.js**: 20.x or later (LTS recommended)
- **Bun**: 1.3.x (package manager)
- **PostgreSQL**: 16+ (local or Docker)
- **Redis**: 7.x (for sessions and queues)
- **S3-compatible storage**: Cloudflare R2, AWS S3, or MinIO (for attachments)

---

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd ticket-app
bun install
```

### 2. Environment Variables

Copy the example env files:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

**Required server environment variables:**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ticket_app

# Redis
REDIS_URL=redis://localhost:6379

# S3 Storage
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=ticket-app-attachments
S3_ACCESS_KEY_ID=<your-key-id>
S3_SECRET_ACCESS_KEY=<your-secret>
S3_PUBLIC_URL=https://your-domain.com/attachments

# Auth
SESSION_SECRET=<random-32-char-secret>
JWT_SECRET=<random-32-char-secret>

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe (optional, for billing)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# PayTabs (optional, for MENA billing)
PAYTABS_SERVER_KEY=
PAYTABS_MERCHANT_ID=
```

### 3. Database Setup

```bash
# Push schema to database (dev only)
bun db:push

# Generate migrations (when schema changes)
bun db:generate

# Apply migrations
bun db:migrate

# Open Drizzle Studio (database GUI)
bun db:studio
```

### 4. Run Development Servers

```bash
# Run all apps in parallel (backend + frontend)
bun dev

# Run only backend
bun dev:server

# Run only frontend
bun dev:web
```

---

## Project Structure

```
ticket-app/
├── apps/
│   ├── server/          # Hono + ORPC backend
│   │   └── src/
│   │       ├── index.ts      # Entry point
│   │       └── routes/       # API routes
│   │
│   └── web/             # React + Vite frontend
│       └── src/
│           ├── routes/       # TanStack Router routes
│           ├── components/   # UI components
│           └── pages/        # Route pages
│
├── packages/
│   ├── api/             # ORPC routers
│   ├── db/              # Drizzle ORM schemas
│   └── ui/              # Shared UI components
│
└── specs/               # Feature specifications
    └── 001-support-platform/
```

---

## Key Technologies

| Layer        | Technology                        |
| ------------ | --------------------------------- |
| Backend      | Hono 4.x + ORPC                   |
| Frontend     | React 19 + Vite + TanStack Router |
| Database     | PostgreSQL 16+ with Drizzle ORM   |
| ORM          | Drizzle 0.45.x                    |
| Auth         | Session-based with bcrypt + OAuth |
| Queues       | BullMQ with Redis                 |
| File Storage | S3-compatible object storage      |
| Payments     | Stripe + PayTabs                  |

---

## Common Tasks

### Generate Database Migrations

```bash
# After modifying schema files in packages/db/src/schema/
bun db:generate
bun db:migrate
```

### Run Type Checking

```bash
bun run check-types
```

### Build for Production

```bash
bun build
```

---

## Feature Validation

### Phase 12: Polish & Cross-Cutting Concerns

After implementing Phase 12 features, validate each component:

#### T149: Dark Mode Support

```bash
# Verify theme.tsx is loaded in the app
# Check that useTheme() hook provides theme switching
# Validate CSS variables are applied correctly
```

#### T150: RTL Layout Support

```bash
# Test with Arabic locale (ar)
# Verify CSS logical properties (margin-inline-start, etc.)
# Check direction: rtl is applied to document.documentElement
```

#### T151: White-Label Branding

```bash
# Verify branding.tsx loads organization branding config
# Check custom colors, logos, and CSS are applied
# Validate email header/footer HTML generation
```

#### T152: Custom Domain Resolution

```bash
# Test custom domain middleware in apps/server/src/middleware/customDomain.ts
# Verify subdomain extraction works
# Validate custom domain vs default domain resolution
```

#### T153: Audit Logging

```bash
# Check audit logs are created for sensitive actions
# Verify audit middleware captures userId, ipAddress, userAgent
# Test audit log entries in database
```

#### T154: API Rate Limiting

```bash
# Test rate limiting with different tiers (standard: 1000/min, enterprise: 5000/min)
# Verify X-RateLimit-* headers are returned
# Check rate limit exceeded returns 429 status
```

#### T155: Structured Logging

```bash
# Verify JSON log format in server logs
# Check request/response logging with trace IDs
# Validate error logging with stack traces
```

#### T156: Metrics Collection

```bash
# Test metrics endpoint returns valid JSON
# Verify http_requests_total counter increments
# Check db_query_duration_seconds histogram works
```

#### T157: Distributed Tracing

```bash
# Verify traceparent header is propagated
# Check trace ID appears in logs
# Validate span context is maintained across requests
```

#### T158: 2FA Enforcement

```bash
# Test admin.enforce2FA mutation
# Verify check2FAEnforced query returns correct status
# Validate 2FA requirement enforcement
```

#### T159-T160: Admin Billing & Reports

```bash
# Verify admin/billing page loads
# Check admin/reports page displays revenue data
# Validate platformStats query returns MRR, user counts
```

#### T161: Database Indexes

```bash
# Run EXPLAIN ANALYZE on common queries
# Verify indexes are used for:
#   - tickets(organization_id, status_id)
#   - ticket_messages(ticket_id)
#   - email_messages(message_id)
#   - contacts(email)
```

#### T162: Zod Validation

```bash
# Test invalid inputs are rejected with proper errors
# Verify all router inputs have Zod schemas
# Check validation on tickets, contacts, subscriptions routers
```

---

## Next Steps

1. Review the [Feature Specification](./spec.md) for implementation details
2. See [Data Model](./data-model.md) for database schema
3. Check [Research](./research.md) for technology decisions
4. Review implementation progress in [Plan](./plan.md)
