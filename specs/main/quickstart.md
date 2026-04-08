# Quickstart: Unified Customer Support & Ticket Management Platform

**Date**: 2026-04-08 | **Status**: Development Guide

---

## Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Bun | 1.3+ | [bun.sh](https://bun.sh) |
| PostgreSQL | 16+ | [postgresql.org](https://www.postgresql.org) |
| Redis | 7+ | [redis.io](https://redis.io) |

---

## Environment Setup

### 1. Clone & Install

```bash
git clone https://github.com/ticket-app/ticket-app.git
cd ticket-app
bun install
```

### 2. Environment Variables

Copy the example env files:

```bash
cp apps/server/.env.example apps/server/.env
cp packages/db/.env.example packages/db/.env
```

**Required Environment Variables:**

```env
# apps/server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/ticket_app
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-32-char-secret
CORS_ORIGIN=http://localhost:5173

# packages/db/.env (for migrations)
DATABASE_URL=postgresql://user:password@localhost:5432/ticket_app
```

### 3. Database Setup

```bash
# Create database
createdb ticket_app

# Push schema (dev)
bun db:push

# Or run migrations
bun db:migrate

# Generate types from schema
bun db:generate
```

### 4. Start Development Servers

```bash
# Start all apps in development mode
bun dev

# Or start individual apps
bun dev:server   # API server on http://localhost:3000
bun dev:web      # Web app on http://localhost:5173
```

---

## Project Structure Overview

```
ticket-app/
├── apps/
│   ├── server/           # Hono API server
│   │   └── src/
│   │       └── index.ts  # Entry point
│   │
│   └── web/              # React frontend
│       └── src/
│           ├── routes/   # TanStack Router routes
│           ├── components/
│           └── pages/
│
├── packages/
│   ├── api/              # ORPC procedures
│   │   └── src/
│   │       └── routers/  # Feature routers
│   │
│   ├── db/               # Drizzle ORM schemas
│   │   └── src/
│   │       └── schema/   # Table definitions
│   │
│   └── ui/               # Shared components
│
└── specs/main/           # Implementation specs
```

---

## Core Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start all apps in dev mode |
| `bun build` | Build all apps |
| `bun check-types` | Type-check all packages |
| `bun db:push` | Push schema to database (dev) |
| `bun db:generate` | Generate Drizzle migrations |
| `bun db:migrate` | Run migrations |
| `bun db:studio` | Open Drizzle Studio |

---

## First-Time Setup

### 1. Create Platform Admin

After database is set up, create your first user:

```bash
# Via the web UI at http://localhost:5173
# Or via seed script (future)
```

### 2. Seed Initial Data

The database seeds required lookup types:

```typescript
// Lookup types seeded:
// - ticket_status: new, open, pending, on_hold, resolved, closed
// - ticket_priority: low, medium, high, urgent, critical
// - task_status: todo, in_progress, done, cancelled
// - task_priority: low, medium, high, urgent
// - channel_type: email, chat, form, social, api
// - social_platform: facebook, instagram, twitter, whatsapp
// - form_field_type: text, email, phone, number, date, etc.
```

### 3. Create Your Organization

Through the web UI or API:
1. Sign up with your email
2. Organization created with Free plan
3. Trial starts with Professional features

---

## Development Workflow

### 1. Making Schema Changes

```bash
# 1. Edit schema in packages/db/src/schema/
# 2. Generate migration
bun db:generate
# 3. Apply migration
bun db:migrate
```

### 2. Creating New API Procedures

```typescript
// packages/api/src/routers/tickets.ts
import { ORPCRouter } from '@orpc/server';
import { z } from 'zod';

export const ticketsRouter = new ORPCRouter()
  .input(z.object({
    organizationId: z.string().uuid(),
    status: z.string().optional(),
  }))
  .handler(async ({ input, context }) => {
    // context.auth contains the authenticated user
    return db.query.tickets.findMany({
      where: eq(tickets.organizationId, input.organizationId),
    });
  });
```

### 3. Adding New Frontend Pages

```typescript
// apps/web/src/routes/tickets.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/tickets')({
  component: TicketsPage,
});

function TicketsPage() {
  return <div>Tickets List</div>;
}
```

---

## Testing

```bash
# Run all tests
bun test

# Run unit tests
bun test --unit

# Run e2e tests
bun test:e2e

# Run with coverage
bun test --coverage
```

---

## Deployment

### Development (Local)

```bash
bun dev:server   # API only
bun dev:web      # Frontend only
```

### Production Build

```bash
bun build
```

### Cloudflare Workers Deployment

```bash
bun deploy
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
psql $DATABASE_URL -c "SELECT 1"
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
```

### Schema Drift

```bash
# Reset database (dev only!)
dropdb ticket_app && createdb ticket_app && bun db:push
```

---

## Next Steps

1. Review [data-model.md](./data-model.md) for full schema reference
2. Review [research.md](./research.md) for architecture decisions
3. Check existing routers in `packages/api/src/routers/`
4. Explore components in `packages/ui/`
