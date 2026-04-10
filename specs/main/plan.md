# Implementation Plan: Real-time Socket System

**Branch**: `main` | **Date**: 2026-04-09 | **Spec**: [link](../001-support-platform/spec.md)
**Input**: Complete WebSocket infrastructure for presence, notifications, and live chat across all apps

---

## Summary

Implement a comprehensive real-time socket system using Socket.io with Redis adapter for horizontal scaling. The system provides: (1) ticket presence tracking showing who is viewing a ticket, (2) real-time notifications for ticket updates/assignments/mentions, and (3) live chat sessions for customer support. The system integrates with web (React), native (Expo/React Native), and desktop (Electrobun) apps.

---

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**:

- Backend: `socket.io` 4.x, `@socket.io/redis-adapter`, `@hono/node-ws` (existing)
- Frontend: `socket.io-client` 4.x
  **Storage**: Redis (existing presence, new for Socket.io adapter and pub/sub)
  **Testing**: Vitest for unit tests, manual WebSocket testing
  **Target Platform**: Node.js server, Browser (web/desktop), Mobile (iOS/Android via Expo)
  **Project Type**: Real-time communication infrastructure
  **Performance Goals**: Support 10k concurrent connections per server instance, sub-100ms message delivery
  **Constraints**: Must work behind load balancer (Redis adapter required), authentication on every connection
  **Scale/Scope**: Multi-tenant via organization rooms, ~50 rooms per organization average

---

## Constitution Check

_No constitution violations identified. This is a greenfield infrastructure feature following established patterns._

---

## Project Structure

### Documentation (this feature)

```text
specs/socket-system/
├── plan.md              # This file
├── research.md          # Socket.io best practices, Redis adapter config
├── data-model.md        # Socket event types, room structure, notification schema
├── quickstart.md        # Dev setup for local socket debugging
└── contracts/          # Socket event contracts
    ├── presence.yaml    # Presence events
    ├── notifications.yaml # Notification events
    └── chat.yaml        # Live chat events
```

### Source Code

```text
apps/server/src/
├── socket/             # Socket.io server setup
│   ├── index.ts         # Socket.io initialization with Redis adapter
│   ├── auth.ts          # Authentication middleware
│   ├── rooms.ts         # Room management (ticket, org, user)
│   ├── handlers/        # Event handlers
│   │   ├── presence.ts  # Presence events
│   │   ├── notifications.ts # Notification events
│   │   └── chat.ts      # Chat events
│   └── emit.ts          # Server-initiated emit helpers

packages/
├── socket-client/       # Shared socket client
│   ├── src/
│   │   ├── index.ts     # Main client export
│   │   ├── hooks.ts     # React hooks (useSocket, usePresence, etc.)
│   │   ├── presence.ts  # Presence utilities
│   │   ├── notifications.ts # Notification utilities
│   │   └── types.ts    # Shared types
│   └── package.json

apps/web/src/
├── hooks/               # Web-specific socket hooks
│   └── useSocket.ts     # Web socket connection hook
├── components/          # Socket-enabled components
│   ├── PresenceAvatars.tsx
│   ├── NotificationToast.tsx
│   └── LiveChatWidget.tsx
└── providers/
    └── SocketProvider.tsx

apps/native/
├── hooks/               # Native-specific socket hooks
│   └── useSocket.ts     # Native socket connection
├── components/          # Native socket components
│   ├── PresenceAvatars.tsx
│   ├── NotificationBanner.tsx
│   └── LiveChatSheet.tsx
└── providers/
    └── SocketProvider.tsx

apps/desktop/            # Uses web build, inherits socket client
```

**Structure Decision**: Centralized `packages/socket-client` provides shared hooks and types. Each app (web/native) provides platform-specific providers and components. Desktop reuses web build.

---

## Complexity Tracking

> Not applicable - no violations

---

## Implementation Phases

### Phase 1: Backend Infrastructure

1. **T001** Add Socket.io dependencies to `apps/server/package.json`:
   - `socket.io` 4.x
   - `@socket.io/redis-adapter`
2. **T002** Create `apps/server/src/socket/index.ts`:
   - Initialize Socket.io server with CORS config
   - Configure Redis adapter using existing `REDIS_URL`
   - Set up connection/disconnection handlers
   - Export `io` instance

3. **T003** Create `apps/server/src/socket/auth.ts`:
   - Extract session token from Socket.io handshake
   - Validate via existing auth context
   - Attach `auth` object to socket data
   - Reject connection if invalid

4. **T004** Create `apps/server/src/socket/rooms.ts`:
   - `joinTicketRoom(socket, ticketId)` - join ticket room
   - `leaveTicketRoom(socket, ticketId)` - leave ticket room
   - `joinOrgRoom(socket, orgId)` - join organization room
   - `joinUserRoom(socket, userId)` - join user private room
   - Helper to get all rooms for an organization

5. **T005** Create `apps/server/src/socket/handlers/presence.ts`:
   - `join_ticket` event - user joins ticket room, broadcast to room
   - `leave_ticket` event - user leaves, broadcast viewer list update
   - `heartbeat` event - refresh presence TTL, ack back
   - `get_viewers` event - return current viewers list

6. **T006** Create `apps/server/src/socket/handlers/notifications.ts`:
   - `mark_read` event - mark notification as read
   - Subscribe to Redis pub/sub channel for server-side notification pushes
   - `notification` event - emit to user-specific room

7. **T007** Create `apps/server/src/socket/handlers/chat.ts`:
   - `join_session` event - join chat session room
   - `leave_session` event - leave chat session
   - `send_message` event - send chat message, broadcast to session room
   - `typing_start` / `typing_stop` events
   - `mark_read` event - mark messages as read

8. **T008** Create `apps/server/src/socket/emit.ts`:
   - `emitToUser(userId, event, data)` - emit to user's private room
   - `emitToTicket(ticketId, event, data)` - emit to ticket room
   - `emitToOrg(orgId, event, data)` - emit to organization room
   - `broadcastTicketUpdate(ticketId, update)` - ticket modified notification

9. **T009** Integrate socket server into `apps/server/src/index.ts`:
   - Import and initialize socket server on app start
   - Mount Socket.io handler at `/socket.io`
   - Replace existing `@hono/node-ws` presence endpoint with Socket.io

10. **T010** Update `packages/queue/src/workers/` to emit socket events:
    - After ticket create/update: emit `ticket_updated`
    - After assignment: emit `ticket_assigned`
    - After new message: emit `ticket_message_added`

### Phase 2: Client Library

11. **T011** Create `packages/socket-client/package.json`:
    - Depends on `socket.io-client` 4.x
    - React peer dependency for hooks

12. **T012** Create `packages/socket-client/src/types.ts`:
    - Socket event type definitions
    - Presence types (mirroring `packages/api/src/lib/presence.ts`)
    - Notification payload types
    - Chat message types

13. **T013** Create `packages/socket-client/src/index.ts`:
    - Export main `SocketClient` class
    - Export all hooks
    - Export types

14. **T014** Create `packages/socket-client/src/hooks.ts`:
    - `useSocket()` - connection management, reconnection logic
    - `usePresence(ticketId)` - join/leave/get viewers for a ticket
    - `useNotifications()` - subscribe to user notifications
    - `useChatSession(sessionId)` - chat message stream

### Phase 3: Web App Integration

15. **T015** Add `socket.io-client` to `apps/web/package.json`

16. **T016** Create `apps/web/src/providers/SocketProvider.tsx`:
    - Context provider wrapping app
    - Initialize socket connection on mount
    - Handle auth token injection
    - Provide socket instance via context

17. **T017** Update `apps/web/src/routes/tickets/[id].tsx`:
    - Wrap conversation section with `usePresence(ticketId)`
    - Show viewer avatars who are currently viewing
    - Display "X is viewing" indicator

18. **T018** Create `apps/web/src/components/PresenceAvatars.tsx`:
    - Show avatar stack of current viewers
    - Tooltip with viewer names
    - Pulse animation for active viewers

19. **T019** Create `apps/web/src/components/NotificationToast.tsx`:
    - Toast notification component
    - Auto-dismiss after 5s
    - Action buttons (view ticket, dismiss)

20. **T020** Create `apps/web/src/components/LiveChatWidget.tsx`:
    - Collapsible chat bubble
    - Chat window with message list
    - Input with send button
    - Typing indicator
    - Badge for unread messages

### Phase 4: Native App Integration

21. **T021** Add `socket.io-client` to `apps/native/package.json`

22. **T022** Create `apps/native/src/providers/SocketProvider.tsx`:
    - Same pattern as web provider
    - Handle app background/foreground transitions
    - Reconnect on network change

23. **T023** Create `apps/native/src/components/PresenceAvatars.tsx`:
    - Native avatar stack component
    - Use `heroui-native` Avatar component

24. **T024** Create `apps/native/src/components/NotificationBanner.tsx`:
    - Slide-down banner for notifications
    - Haptic feedback on arrival

25. **T025** Create `apps/native/src/components/LiveChatSheet.tsx`:
    - Bottom sheet chat interface
    - Use `@gorhom/bottom-sheet`

26. **T026** Update `apps/native/app/(drawer)/tickets/[id].tsx`:
    - Add presence hook
    - Add notification subscription

### Phase 5: Desktop App Integration

27. **T027** Desktop inherits web build - no additional socket code needed
    - Ensure `socket.io-client` is included in web build
    - Verify SocketProvider works in Electron context

### Phase 6: Testing & Polish

28. **T028** Create socket integration test suite:
    - `apps/server/test/socket/presence.test.ts`
    - Test join/leave/heartbeat flow
    - Test room isolation between organizations

29. **T029** Add socket debugging to `apps/server/src/lib/logger.ts`:
    - Log socket connections/disconnections
    - Log room joins/leaves

30. **T030** Document socket events in `specs/socket-system/contracts/`:
    - `presence.yaml` - presence event schema
    - `notifications.yaml` - notification payload schema
    - `chat.yaml` - chat message schema

---

## Dependencies

```
Phase 1 (Backend) ← T001-T010
    ↓
Phase 2 (Client Lib) ← T011-T014 (depends on T001-T003)
    ↓
Phase 3 (Web) ← T015-T020 (depends on T011-T014)
Phase 4 (Native) ← T021-T026 (depends on T011-T014)
    ↓
Phase 5 (Desktop) ← T027 (depends on T015-T020)
    ↓
Phase 6 (Testing) ← T028-T030 (depends on all)
```

---

## Parallel Opportunities

| Tasks            | Reason                                 |
| ---------------- | -------------------------------------- |
| T002, T003, T004 | Independent socket setup modules       |
| T005, T006, T007 | Different event handler files          |
| T015, T021       | Web and native can be done in parallel |
| T018, T023       | Presence UI components independent     |
| T019, T024       | Notification UI components independent |
| T020, T025       | Chat UI components independent         |

---

## Independent Test Criteria

### Backend (T001-T010)

- Socket.io server starts and accepts connections at `/socket.io`
- Connection rejected without valid auth token
- Redis adapter connects and enables cross-server communication
- User can join/leave ticket room
- Viewer list broadcasts to all room members on join/leave
- Heartbeat refreshes presence and returns ack within 50ms
- Server can emit to user-specific room from any handler
- Ticket updates via queue workers trigger socket events

### Client Library (T011-T014)

- `useSocket()` hook returns connected socket instance
- `useSocket()` reconnects automatically on disconnect
- `usePresence(ticketId)` joins room on mount, leaves on unmount
- `usePresence(ticketId)` returns current viewers list
- `useNotifications()` receives notification events for logged-in user
- `useChatSession(sessionId)` streams messages in real-time

### Web App (T015-T020)

- SocketProvider initializes connection on app load
- Presence avatars show on ticket detail page
- Notification toasts appear for relevant events
- Chat widget opens/closes and sends/receives messages

### Native App (T021-T026)

- SocketProvider handles app lifecycle (background/foreground)
- Presence avatars display correctly on ticket screen
- Notification banners slide down on new notifications
- Chat sheet opens as bottom sheet and functions properly

---

**Total Tasks**: 30 tasks (10 backend + 4 client lib + 6 web + 6 native + 1 desktop + 3 testing/docs)
**Completed**: 0 tasks
**Remaining**: 30 tasks
**Status**: 📋 PLANNING COMPLETE
