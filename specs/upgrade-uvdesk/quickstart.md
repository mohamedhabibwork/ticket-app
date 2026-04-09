# UVDesk Upgrade - Quickstart Guide

**Date**: 2026-04-09 | **Feature**: 001-support-platform

## Overview

This guide covers setup and verification for the UVDesk upgrade features across all 4 sprints.

## New Features Added

### Sprint 1: Core Infrastructure
- **Groups**: Department-level organization of teams
- **Ticket Categories**: SLA-based ticket routing
- **Agent Visibility Scopes**: Role-based ticket filtering (`self`, `group`, `all`)
- **Thread-Level Locking**: Prevent concurrent edits
- **Thread Omission Audit**: Soft delete with reason tracking

### Sprint 2: Agent Experience
- **Real-time Presence**: WebSocket-based concurrent viewer tracking
- **Ticket Forwarding**: Forward tickets to external emails
- **Image Gallery**: Thumbnail generation and lightbox viewer
- **GDPR Workflow**: Data subject request management (access, erasure, portability)
- **Customer Portal SSO**: Google, Facebook, Apple sign-in

### Sprint 3: Integrations
- **Machine Translation**: Google Translate + DeepL fallback
- **Google Calendar**: OAuth integration for agents
- **Disqus**: Forum comment import as tickets
- **Amazon Seller Central**: Buyer-seller messaging

### Sprint 4: Mobile & AI
- **Mobile SDK**: FCM/APNs push notifications
- **AI Chatbot**: KB-based RAG with confidence thresholds
- **On-Premise Licensing**: RSA-signed JWT verification

## Setup

### 1. Environment Variables

Add these new environment variables:

```env
# Google OAuth (Calendar + Translation)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# DeepL Translation
DEEPL_API_KEY=

# Disqus
DISQUS_API_KEY=
DISQUS_API_SECRET=

# Amazon SP-API
AMAZON_CLIENT_ID=
AMAZON_CLIENT_SECRET=
AMAZON_REFRESH_TOKEN=

# Firebase (Push Notifications)
FCM_PROJECT_ID=
FCM_API_KEY=

# Apple Sign-In
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_PRIVATE_KEY=

# On-Premise Licensing
LICENSE_PUBLIC_KEY=
```

### 2. Database Migrations

```bash
# Generate migrations
bun run db:generate

# Push to development database
bun run db:push

# Apply migrations
bun run db:migrate
```

### 3. Redis

Ensure Redis is running for:
- Real-time presence (WebSocket heartbeat)
- Chatbot session caching
- Translation cache

### 4. Build

```bash
# Type check all packages
bun run check-types

# Build all apps
bun run build
```

## Verification

### Sprint 1 Verification
1. Create a group and assign a team to it
2. Create a ticket category with SLA policy
3. Set agent role scope to `self` and verify ticket filtering
4. Lock a thread message and verify edit prevention

### Sprint 2 Verification
1. Open same ticket in two browser tabs - verify viewer presence
2. Forward a ticket to external email
3. Upload images and verify thumbnail gallery
4. Submit GDPR request and verify data export
5. Test social login (Google/Facebook/Apple)

### Sprint 3 Verification
1. Translate a ticket message
2. Connect Google Calendar and create event
3. Setup Disqus forum and verify comment import
4. Connect Amazon Seller Central and verify message sync

### Sprint 4 Verification
1. Configure mobile SDK and send test push notification
2. Enable chatbot, create KB articles, verify bot responses
3. Install on-premise license and verify seat enforcement

## API Routers

The following 13 new routers were added:

| Router | File | Description |
|--------|------|-------------|
| `groups` | `packages/api/src/routers/groups.ts` | Department groups |
| `ticketCategories` | `packages/api/src/routers/ticketCategories.ts` | Ticket categories |
| `ticketForwards` | `packages/api/src/routers/ticketForwards.ts` | Ticket forwarding |
| `presence` | `packages/api/src/routers/presence.ts` | Real-time presence |
| `gdpr` | `packages/api/src/routers/gdpr.ts` | GDPR requests |
| `disqus` | `packages/api/src/routers/disqus.ts` | Disqus integration |
| `marketplace` | `packages/api/src/routers/marketplace.ts` | Amazon/e-commerce |
| `calendar` | `packages/api/src/routers/calendar.ts` | Google Calendar |
| `customerAuth` | `packages/api/src/routers/customerAuth.ts` | Social SSO |
| `translation` | `packages/api/src/routers/translation.ts` | Machine translation |
| `mobileSdk` | `packages/api/src/routers/mobileSdk.ts` | Push notifications |
| `chatbot` | `packages/api/src/routers/chatbot.ts` | AI chatbot |
| `onPremise` | `packages/api/src/routers/onPremise.ts` | License management |

## Workers

New background workers added:

| Worker | File | Purpose |
|--------|------|---------|
| `gdpr-slack-check` | `packages/queue/src/workers/gdpr-slack-check.worker.ts` | GDPR SLA monitoring |
| `amazon-sync` | `packages/queue/src/workers/amazon-sync.worker.ts` | Amazon message polling |
| `disqus-sync` | `packages/queue/src/workers/disqus-sync.worker.ts` | Disqus comment polling |
| `push-notification` | `packages/queue/src/workers/push-notification.worker.ts` | Push delivery |
| `chatbot-escalation` | `packages/queue/src/workers/chatbot-escalation.worker.ts` | Bot escalation |
| `license-verification` | `packages/queue/src/workers/license-verification.worker.ts` | Daily license check |

## WebSocket Endpoint

Presence uses Bun/Hono WebSocket:

```typescript
// apps/server/src/index.ts
ws: {
  '/ws/presence': presenceHandler
}
```

Client joins presence on ticket open:
```typescript
await orpcClient.presence.join({
  ticketId: 123,
  userId: 456,
  userName: 'Agent Name'
})
```

## New Tables

| Table | Schema File |
|-------|-------------|
| `groups` | `packages/db/src/schema/_groups.ts` |
| `ticket_categories` | `packages/db/src/schema/_tickets.ts` |
| `ticket_forwards` | `packages/db/src/schema/_tickets.ts` |
| `presence` | `packages/db/src/schema/_tickets.ts` |
| `gdpr_requests` | `packages/db/src/schema/_audit.ts` |
| `disqus_accounts` | `packages/db/src/schema/_social.ts` |
| `marketplace_accounts` | `packages/db/src/schema/_ecommerce.ts` |
| `marketplace_messages` | `packages/db/src/schema/_ecommerce.ts` |
| `agent_calendar_connections` | `packages/db/src/schema/_calendar.ts` |
| `ticket_calendar_events` | `packages/db/src/schema/_calendar.ts` |
| `customer_social_identities` | `packages/db/src/schema/_contacts.ts` |
| `customer_sessions` | `packages/db/src/schema/_contacts.ts` |
| `translation_configs` | `packages/db/src/schema/_settings.ts` |
| `translation_cache` | `packages/db/src/schema/_settings.ts` |
| `mobile_sdk_configs` | `packages/db/src/schema/_settings.ts` |
| `contact_push_tokens` | `packages/db/src/schema/_contacts.ts` |
| `push_notification_logs` | `packages/db/src/schema/_audit.ts` |
| `chatbot_configs` | `packages/db/src/schema/_ai.ts` |
| `chatbot_sessions` | `packages/db/src/schema/_ai.ts` |
| `chatbot_messages` | `packages/db/src/schema/_ai.ts` |
| `on_premise_licenses` | `packages/db/src/schema/_billing.ts` |

## New Permissions

| Permission | Description |
|------------|-------------|
| `tickets.view_scope.all` | View all tickets |
| `tickets.view_scope.group` | View group tickets only |
| `tickets.view_scope.self` | View assigned tickets only |
| `threads.lock` | Lock thread messages |
| `threads.unlock` | Unlock thread messages |
| `threads.view_locked` | View locked threads |
| `threads.delete` | Soft delete threads |
| `threads.view_deleted` | View deleted threads |
| `gdpr.requests.manage` | Manage GDPR requests |
| `marketplace.view` | View marketplace messages |
| `marketplace.reply` | Reply via marketplace |
| `chatbot.configure` | Configure chatbot |
| `translation.use` | Use translation |
| `calendar.connect` | Connect calendar |
