# UVDesk Upgrade - Research Decisions

**Date**: 2026-04-09 | **Source**: `UPGRADE-UVDESK.md`

## 1. Real-Time Presence Architecture

**Decision**: Redis Pub/Sub + Bun/Hono WebSocket

**Rationale**:

- Bun native WebSocket support in Hono (` hono/websocket`)
- Redis pub/sub for multi-instance horizontal scaling (presence must work across all server instances)
- 30-second TTL heartbeat with Redis key expiration
- No need for Socket.io (Bun/Hono native is lighter)

**Alternatives considered**:

- Socket.io: Overkill, larger bundle, not needed for simple presence
- Cloudflare Durable Objects: Excellent for single-region, but our deployment is multi-cloud
- SSE: One-directional only, not suitable for presence broadcasts

## 2. Machine Translation Provider

**Decision**: Google Translate API (primary) + DeepL (fallback)

**Rationale**:

- Google Translate covers 130+ languages including Arabic (critical for MENA market)
- Per-character pricing with free tier
- `translate.v2` API is well-documented
- DeepL as fallback for European languages where quality matters more

**Alternatives considered**:

- Azure Translator: More expensive, less language coverage
- DeepL only: Excellent quality but fewer languages, more expensive

## 3. Amazon SP-API Integration

**Decision**: `@amazon/sp-api` community SDK + custom wrapper

**Rationale**:

- Official Amazon Selling Partner API requires LWA token exchange
- `amazon-sp-api` npm package handles OAuth flow
- Custom wrapper for messaging operations (not covered by generic SDK)
- Selling Partner API for Messaging v2021

**Alternatives considered**:

- Custom implementation: Too much work for OAuth + API surface
- MWS (Legacy): Deprecated by Amazon

## 4. Mobile Push Notifications

**Decision**: FCM for Android + APNs direct for iOS (no third-party)

**Rationale**:

- Direct FCM/APNs avoids third-party markup
- `firebase-admin` for Node.js/Bun handles FCM
- APNs with p8 certificate (no authKey management)
- Push token registration via mobile SDK config API

**Alternatives considered**:

- OneSignal: Easier but adds dependency, revenue share for enterprise
- Supabase Edge Functions: Good for small scale but not enterprise-grade

## 5. On-Premise License Enforcement

**Decision**: RSA-signed JWT license file with daily verification

**Rationale**:

- License file contains: org name, seat count, features JSON, expiry, RSA signature
- Application verifies signature locally on startup (no callback home required)
- Daily background job re-verifies (allows grace period for offline deployments)
- Encrypted seat enforcement in application code (cannot exceed max_agents)

**Alternatives considered**:

- Online verification with grace period: Violates data sovereignty requirement
- Hardware dongle: Too complex for software deployment

## 6. AI Chatbot Knowledgebase RAG

**Decision**: Google Gemini embeddings + vector similarity search

**Rationale**:

- Gemini 1.5 Flash is cost-effective for embedding generation
- Organization's KB articles pre-embedded and stored in `chatbot_configs` or dedicated vector store
- Retrieval: Top-k semantic search against KB article embeddings
- `ai` package with `@ai-sdk/google` already in codebase

**Alternatives considered**:

- OpenAI `text-embedding-3`: More expensive, same quality
- Claude: Excellent but more expensive, not in current stack
- Pinecone/Weaviate: Adds external dependency

## 7. Disqus API Integration

**Decision**: Disqus API v3 via server-to-server calls

**Rationale**:

- Disqus does not have OAuth for forum owner access; uses API key only
- Forum threads ingested via `GET /posts/{post}/list` endpoint
- New comments polled and converted to tickets
- Agent replies posted back via `POST /posts/{post}/approve` or `POST /posts/{post}/reply`

**Alternatives considered**:

- Webhook: Disqus webhooks only notify, not fetch full comment data
- Third-party Disqus wrapper: None reliable available

---

## Research Status

| #   | Topic                           | Status  |
| --- | ------------------------------- | ------- |
| 1   | Real-time presence architecture | DECIDED |
| 2   | Machine translation provider    | DECIDED |
| 3   | Amazon SP-API integration       | DECIDED |
| 4   | Mobile push notifications       | DECIDED |
| 5   | On-premise license enforcement  | DECIDED |
| 6   | AI chatbot knowledgebase RAG    | DECIDED |
| 7   | Disqus API integration          | DECIDED |

All unknowns resolved. Proceed to data-model.md.
