# Tasks: Real-time Socket System with Bun Socket Support

**Feature**: socket-system | **Date**: 2026-04-09
**Stack**: TypeScript 5.x, Socket.io 4.x, Bun Native WebSocket, Redis Adapter

---

## Phase 1: Setup

- [x] T001 Add dependencies to `apps/server/package.json`: `socket.io` 4.x, `@socket.io/redis-adapter`

## Phase 2: Foundational

- [x] T002 Create `apps/server/src/socket/index.ts` with Bun native WebSocket server using `Bun.serve` with WebSocket upgrade
- [x] T003 Create `apps/server/src/socket/auth.ts` - JWT validation middleware for Bun WebSocket
- [x] T004 Create `apps/server/src/socket/rooms.ts` - Room management (ticket, org, user rooms)
- [x] T005 Create `apps/server/src/socket/handlers/presence.ts` - Presence events (join_ticket, leave_ticket, heartbeat, get_viewers)
- [x] T006 Create `apps/server/src/socket/handlers/notifications.ts` - Notification events (mark_read, notification broadcast)
- [x] T007 Create `apps/server/src/socket/handlers/chat.ts` - Chat events (join_session, leave_session, send_message, typing)
- [x] T008 Create `apps/server/src/socket/emit.ts` - Server-initiated emit helpers (emitToUser, emitToTicket, emitToOrg)
- [x] T009 Create `apps/server/src/socket/adapter.ts` - Redis adapter setup using `@socket.io/redis-adapter` with existing `REDIS_URL`

## Phase 3: Server Integration

- [x] T010 Update `apps/server/src/index.ts` to mount Bun WebSocket server at `/ws` endpoint
- [x] T011 Replace existing `@hono/node-ws` presence endpoint with Bun WebSocket handler
- [x] T012 Create `apps/server/src/socket/pubsub.ts` - Redis pub/sub subscriber for server-initiated events
- [x] T013 Update `packages/queue/src/workers/` to publish socket events via Redis pub/sub after ticket create/update/assignment

## Phase 4: Client Library

- [x] T014 Create `packages/socket-client/package.json` with `socket.io-client` 4.x dependency
- [x] T015 Create `packages/socket-client/src/types.ts` - Socket event types (ViewerPresence, NotificationPayload, ChatMessage, TicketUpdatePayload)
- [x] T016 Create `packages/socket-client/src/hooks.ts` - React hooks (useSocket, usePresence, useNotifications, useChatSession)
- [x] T017 Create `packages/socket-client/src/index.ts` - Main exports

## Phase 5: Web App Integration

- [x] T018 Add `socket.io-client` to `apps/web/package.json`
- [x] T019 Create `apps/web/src/providers/SocketProvider.tsx` - Context provider with auth token injection and reconnection logic
- [x] T020 [P] Create `apps/web/src/components/PresenceAvatars.tsx` - Avatar stack showing current ticket viewers with pulse animation
- [x] T021 [P] Create `apps/web/src/components/NotificationToast.tsx` - Toast component with auto-dismiss and action buttons
- [x] T022 [P] Create `apps/web/src/components/LiveChatWidget.tsx` - Collapsible chat bubble with message list and typing indicator
- [x] T023 Update `apps/web/src/routes/tickets/[id].tsx` to integrate `usePresence(ticketId)` hook and display viewer avatars

## Phase 6: Native App Integration

- [x] T024 Add `socket.io-client` to `apps/native/package.json`
- [x] T025 Create `apps/native/src/providers/SocketProvider.tsx` - Provider with app background/foreground handling via AppState
- [x] T026 [P] Create `apps/native/src/components/PresenceAvatars.tsx` - Native avatar stack using `heroui-native` Avatar
- [x] T027 [P] Create `apps/native/src/components/NotificationBanner.tsx` - Slide-down banner with haptic feedback
- [x] T028 [P] Create `apps/native/src/components/LiveChatSheet.tsx` - Bottom sheet chat using `@gorhom/bottom-sheet`
- [x] T029 Update `apps/native/app/(drawer)/tickets/[id].tsx` to integrate presence and notification hooks

## Phase 7: Desktop App Integration

- [x] T030 Verify `socket.io-client` included in web build for desktop (electrobun)
- [x] T031 Verify SocketProvider works in Electron context (desktop reuses web build)

## Phase 8: Testing & Documentation

- [x] T032 Create `apps/server/test/socket/presence.test.ts` - Vitest integration tests for join/leave/heartbeat and org isolation
- [x] T033 Add socket debugging to `apps/server/src/lib/logger.ts` - Log connections, disconnections, room joins/leaves
- [x] T034 Update `specs/main/contracts/presence.yaml` with Bun WebSocket event schema
- [x] T035 Update `specs/main/contracts/notifications.yaml` with notification event schema
- [x] T036 Update `specs/main/contracts/chat.yaml` with chat event schema

---

## Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← T002-T009
    ↓
Phase 3 (Server Integration) ← T010-T013 (depends on T002-T009)
    ↓
Phase 4 (Client Lib) ← T014-T017 (depends on T002-T003)
    ↓
Phase 5 (Web) ← T018-T023 (depends on T014-T017)
Phase 6 (Native) ← T024-T029 (depends on T014-T017)
    ↓
Phase 7 (Desktop) ← T030-T031 (depends on T018-T023)
    ↓
Phase 8 (Testing) ← T032-T036 (depends on all)
```

---

## Parallel Opportunities

| Tasks            | Reason                                     |
| ---------------- | ------------------------------------------ |
| T003, T004       | Independent middleware modules             |
| T005, T006, T007 | Different event handler files              |
| T020, T021, T022 | Web UI components independent              |
| T026, T027, T028 | Native UI components independent           |
| T018, T024       | Web and native package updates independent |
| T034, T035, T036 | Contract documentation independent         |

---

## Independent Test Criteria

### Server (T002-T009, T010-T013)

- Bun WebSocket server starts and accepts connections at `/ws`
- Connection rejected without valid JWT token
- Redis adapter connects and syncs across server instances
- User can join/leave ticket room
- Viewer list broadcasts to all room members on join/leave
- Heartbeat refreshes presence and returns ack within 50ms
- Server can emit to user-specific room via pub/sub
- Queue workers publish events to Redis on ticket changes

### Client Library (T014-T017)

- `useSocket()` returns connected socket instance
- `useSocket()` reconnects automatically on disconnect
- `usePresence(ticketId)` joins room on mount, leaves on unmount
- `usePresence(ticketId)` returns current viewers list
- `useNotifications()` receives notification events for logged-in user
- `useChatSession(sessionId)` streams messages in real-time

### Web App (T018-T023)

- SocketProvider initializes connection on app load
- Presence avatars display on ticket detail page
- Notification toasts appear for relevant events
- Chat widget opens/closes and sends/receives messages

### Native App (T024-T029)

- SocketProvider handles app lifecycle (background/foreground)
- Presence avatars display correctly on ticket screen
- Notification banners slide down with haptic feedback
- Chat sheet opens as bottom sheet and functions properly

---

## Bun Socket Implementation Notes

The server uses Bun's native WebSocket support (`Bun.serve` with WebSocket upgrade) instead of `@hono/node-ws`:

```typescript
// apps/server/src/socket/index.ts
const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const success = server.upgrade(req, {
        data: { auth: validateToken(req) },
      });
      if (success) return undefined;
    }
    return new Response("Socket server running", { status: 200 });
  },
  websocket: {
    open(ws) {
      /* handle open */
    },
    message(ws, msg) {
      /* handle message */
    },
    close(ws, code, reason) {
      /* handle close */
    },
  },
});
```

Redis adapter for Socket.io requires separate configuration since Bun's WebSocket doesn't natively support Socket.io protocol. Consider using `@socket.io/redis-adapter` with a custom Bun-native Redis client.

---

**Total Tasks**: 36 tasks
**Completed**: 36 tasks
**Remaining**: 0 tasks
**Status**: ✅ IMPLEMENTATION COMPLETE
