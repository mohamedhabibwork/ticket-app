# Research: Real-time Socket System

**Date**: 2026-04-09 | **Feature**: Socket System

---

## Decision 1: Socket.io vs Raw WebSocket

**Chosen**: Socket.io 4.x

**Rationale**:

- Built-in reconnection handling with exponential backoff
- Automatic room/namespace management
- Redis adapter for horizontal scaling (official adapter available)
- Fallback to long-polling if WebSocket fails
- Client libraries for web, React Native, and Node.js
- TypeScript support out of the box

**Alternatives Considered**:

- Raw `ws` library: Lower level, would need to implement reconnection, rooms, and Redis adapter manually
- Server-Sent Events (SSE): One-directional only (server→client), not suitable for chat
- GraphQL Subscriptions: Overkill for this use case, more complexity than needed

---

## Decision 2: Redis Adapter Configuration

**Chosen**: `@socket.io/redis-adapter` with existing `REDIS_URL`

**Rationale**:

- Enables horizontal scaling (multiple server instances share connection state)
- Uses existing Redis infrastructure (already used for presence)
- Pub/sub pattern for broadcasting events across servers
- Minimal additional infrastructure

**Configuration**:

```typescript
const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();
const adapter = createAdapter(pubClient, subClient);
io.adapter(adapter);
```

---

## Decision 3: Room Structure

**Chosen**: Hierarchical room naming with organization isolation

**Room Types**:

1. `org:{orgId}` - Organization-wide broadcasts
2. `ticket:{ticketId}` - Ticket-specific presence and updates
3. `user:{userId}` - User's private notification channel
4. `chat:{sessionId}` - Live chat session room

**Rationale**:

- Organization isolation prevents cross-tenant data leakage
- Ticket rooms allow targeted updates
- User rooms for private notifications (new assignments, mentions)
- Chat rooms separate from ticket presence

---

## Decision 4: Authentication Strategy

**Chosen**: JWT token in Socket.io handshake query/headers

**Flow**:

1. Client obtains JWT from existing auth system (via ORPC `/auth/login`)
2. Client passes token in Socket.io connection handshake
3. Server validates token and extracts `userId` and `organizationId`
4. Server attaches auth data to `socket.data`

**Rationale**:

- Works with existing JWT-based auth infrastructure
- Token validation on every connection (no stale sessions)
- Can extract org context for room validation

---

## Decision 5: Presence Heartbeat Strategy

**Chosen**: Client-driven heartbeat with Redis TTL

**Implementation**:

- Client sends `heartbeat` event every 15 seconds
- Server refreshes Redis key TTL to 30 seconds
- Background job (or lazy cleanup) removes stale entries on read
- Server broadcasts viewer list updates on join/leave/TTL expiry

**Rationale**:

- 15s heartbeat interval balances between responsiveness and server load
- 30s TTL provides 2-heartbeat grace period for network hiccups
- Redis TTL ensures automatic cleanup of stale presence data

---

## Decision 6: Event Naming Convention

**Chosen**: `snake_case` event names with verb_noun pattern

**Examples**:

- `join_ticket` / `leave_ticket` - presence actions
- `viewer_joined` / `viewer_left` - presence broadcasts
- `ticket_updated` / `message_added` - domain events
- `notification` - envelope event containing notification payload

**Rationale**:

- Consistent with existing REST API conventions
- Clear distinction between client requests (`join_ticket`) and server broadcasts (`viewer_joined`)
- Namespaced feel with underscores

---

## Decision 7: Client Reconnection Strategy

**Chosen**: Socket.io built-in reconnection with React Query integration

**Implementation**:

- Socket.io handles automatic reconnection with exponential backoff
- On reconnect, re-join all rooms the client was in (store in React state/context)
- React Query invalidates relevant queries on reconnect to refetch fresh data
- Presence hooks re-join rooms on connection restored

**Rationale**:

- Socket.io reconnection is battle-tested
- Combining with React Query ensures UI stays in sync with server state
- Room state restoration ensures no missed events after reconnect

---

## Decision 8: Mobile Background Handling

**Chosen**: Pause socket on app background, resume on foreground

**Implementation**:

- Use `AppState` from React Native to detect background/foreground
- On `background`, disconnect socket gracefully
- On `foreground`, reconnect socket and re-join necessary rooms
- Use `expo-secure-store` for persisting auth token

**Rationale**:

- Battery life - continuous WebSocket drains battery
- iOS may kill long-running connections in background
- Server already handles stale presence via TTL
- Reconnection on resume ensures fresh state

---

## Decision 9: Server-initiated Emissions

**Chosen**: Emit from queue workers via Redis pub/sub, not direct Socket.io

**Implementation**:

1. Queue worker finishes job (e.g., ticket assigned)
2. Worker publishes event to Redis channel `socket:events`
3. Socket server subscribes to `socket:events`
4. Socket server emits to appropriate room based on event

**Rationale**:

- Decouples queue workers from Socket.io (workers don't need io instance)
- Works regardless of which server instance handles the request
- Easier to add new event types without modifying main socket server

---

## Decision 10: Chat Message Persistence

**Chosen**: Chat messages saved to DB via API, real-time delivery via Socket.io

**Flow**:

1. Client sends message via Socket.io `send_message` event
2. Server validates, saves to DB via existing chat API
3. Server broadcasts saved message to session room
4. Client receives and renders message

**Rationale**:

- Messages persist beyond socket session
- Works with existing chat tables in schema
- Socket.io just handles real-time delivery
- Can replay history by fetching via REST API

---

## References

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Socket.io Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Socket.io Client React](https://socket.io/docs/v4/react/)
- [Hono WebSocket Middleware](https://hono.dev/docs/helpers/websocket)
