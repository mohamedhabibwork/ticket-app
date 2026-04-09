# ticket-app Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-09

## Active Technologies
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (main)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (main)

**Backend**: Hono 4.x, ORPC 0.4.x, Drizzle ORM 0.45.x
**Frontend**: React 19, Vite, TanStack Router, TailwindCSS v4
**Database**: PostgreSQL 16+, Redis (sessions/queues)
**Storage**: S3-compatible object storage
**Payments**: Stripe, PayTabs

## Project Structure

```text
apps/
├── server/                     # Hono + ORPC backend
│   ├── src/index.ts            # Server entry point
│   └── src/routes/             # Route handlers
├── web/                        # React SPA frontend
│   ├── src/routes/             # TanStack Router routes
│   ├── src/components/         # Shared UI components
│   └── src/pages/              # Route page components
packages/
├── api/                        # ORPC routers (shared)
│   └── src/routers/           # tickets, contacts, users, billing, etc.
├── db/                         # Drizzle ORM schemas
│   └── src/schema/            # _lookups, _organizations, _tickets, etc.
```

## Commands

```bash
# Install dependencies
bun install

# Run all apps (backend + frontend)
bun dev

# Run only backend
bun dev:server

# Run only frontend
bun dev:web

# Database operations
bun db:push      # Push schema (dev)
bun db:generate  # Generate migrations
bun db:migrate   # Apply migrations
bun db:studio    # Open Drizzle Studio

# Type checking
bun run check-types
```

## Code Style

- TypeScript 5.x with strict mode
- snake_case for database identifiers
- camelCase for TypeScript/JavaScript
- Follow existing conventions in codebase

## Recent Changes
- main: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

- **2026-04-08**: Completed `/speckit.plan` execution for `001-support-platform` feature
  - Created feature specification (spec.md) with 8 User Stories, 66 FRs
  - Filled implementation plan (plan.md) with 6-phase roadmap
  - Generated research.md (18 technology decisions)
  - Generated data-model.md (Drizzle schema from ERD)
  - Created quickstart.md (development setup guide)
  - Set up contracts/ with OpenAPI specs (tickets, users, billing, webhooks)

## Feature: 001-support-platform (Unified Customer Support & Ticket Management Platform)

**Status**: Planning complete, implementation pending

**Key Artifacts**:
- `specs/001-support-platform/spec.md` - Feature specification
- `specs/001-support-platform/plan.md` - Implementation plan
- `specs/001-support-platform/research.md` - Technology decisions
- `specs/001-support-platform/data-model.md` - Drizzle ORM schema
- `specs/001-support-platform/quickstart.md` - Dev setup guide
- `specs/001-support-platform/contracts/` - OpenAPI specifications

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
