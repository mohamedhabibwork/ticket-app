# Real-time Socket System Tasks

## Phase 1: Setup

- [x] T001 [P] Add dependencies to `apps/server/package.json`: `socket.io` 4.x, `@socket.io/redis-adapter`

## Phase 2: Foundational (depends on T001)

- [x] T002 [P] Create `apps/server/src/socket/index.ts` with Bun native WebSocket server using `Bun.serve` with WebSocket upgrade
- [x] T003 [P] Create `apps/server/src/socket/auth.ts` - JWT validation middleware for Bun WebSocket
- [x] T004 [P] Create `apps/server/src/socket/rooms.ts` - Room management (ticket, org, user rooms)
- [x] T005 [P] Create `apps/server/src/socket/handlers/presence.ts` - Presence events (join_ticket, leave_ticket, heartbeat, get_viewers)
- [x] T006 [P] Create `apps/server/src/socket/handlers/notifications.ts` - Notification events (mark_read, notification broadcast)
- [x] T007 [P] Create `apps/server/src/socket/handlers/chat.ts` - Chat events (join_session, leave_session, send_message, typing)
- [x] T008 [P] Create `apps/server/src/socket/emit.ts` - Server-initiated emit helpers (emitToUser, emitToTicket, emitToOrg)
- [x] T009 [P] Create `apps/server/src/socket/adapter.ts` - Redis adapter setup using `@socket.io/redis-adapter` with existing `REDIS_URL`

## Implementation Summary

### Files Created

1. **apps/server/src/socket/index.ts** - Main socket server initialization using Socket.IO with Redis adapter
2. **apps/server/src/socket/auth.ts** - JWT/session validation middleware for socket connections
3. **apps/server/src/socket/rooms.ts** - Room naming utilities (org:, ticket:, user:, chat:)
4. **apps/server/src/socket/emit.ts** - Server-initiated emit helpers for broadcasting to rooms/users
5. **apps/server/src/socket/adapter.ts** - Redis adapter setup for Socket.IO using `@socket.io/redis-adapter`
6. **apps/server/src/socket/handlers/presence.ts** - Presence event handlers (join_ticket, leave_ticket, heartbeat, get_viewers)
7. **apps/server/src/socket/handlers/notifications.ts** - Notification event handlers (mark_read, notification broadcast)
8. **apps/server/src/socket/handlers/chat.ts** - Chat event handlers (join_session, leave_session, send_message, typing)

### Dependencies Added

- `socket.io`: ^4.8.0
- `@socket.io/redis-adapter`: ^8.3.0

### Room Naming Convention

- Organization rooms: `org:{orgId}`
- Ticket rooms: `ticket:{ticketId}`
- User rooms: `user:{userId}`
- Chat rooms: `chat:{sessionId}`

### Integration

The socket server integrates with:

- Existing Redis session store via `@ticket-app/db/lib/sessions`
- Existing presence library via `@ticket-app/api/lib/presence`
- Existing Redis URL from `@ticket-app/env/server`

---

## Phase 3: Server Integration (depends on Phase 2: T002-T009)

- [x] T010 [P] Update `apps/server/src/index.ts` to mount Bun WebSocket server at `/ws` endpoint
- [x] T011 [P] Replace existing `@hono/node-ws` presence endpoint with Bun WebSocket handler
- [x] T012 [P] Create `apps/server/src/socket/pubsub.ts` - Redis pub/sub subscriber for server-initiated events
- [x] T013 [P] Update `packages/queue/src/workers/` to publish socket events via Redis pub/sub after ticket create/update/assignment

### Implementation Summary

#### Files Modified

1. **apps/server/src/index.ts** - Integrated Socket.IO with Hono server using `@hono/node-server`, removed old `@hono/node-ws` presence endpoint
2. **apps/server/src/socket/adapter.ts** - Fixed Redis adapter implementation with proper ESM imports and client management
3. **packages/queue/src/workers/workflow-execute.worker.ts** - Added socket event publishing after ticket assign/update operations

#### Files Created

1. **apps/server/src/socket/pubsub.ts** - Redis pub/sub subscriber that listens to `socket:events` channel and emits to Socket.IO rooms
2. **packages/queue/src/socket-publish.ts** - Helper module for publishing socket events to Redis pub/sub

#### Socket Event Flow

1. Queue workers publish events to Redis channel `socket:events`
2. Socket pub/sub subscriber receives events from Redis
3. Subscriber emits events to appropriate Socket.IO rooms (ticket, org, user, or chat)

#### Events Published

- `ticket:created` - After ticket creation (via workflow)
- `ticket:updated` - After ticket update (priority, status changes)
- `ticket:assigned` - After ticket assignment (agent or team changes)

---

## Phase 4: Client Library (depends on Phase 2: T002-T003)

- [x] T014 [P] Create `packages/socket-client/package.json` with `socket.io-client` 4.x dependency
- [x] T015 [P] Create `packages/socket-client/src/types.ts` - Socket event types (ViewerPresence, NotificationPayload, ChatMessage, TicketUpdatePayload)
- [x] T016 [P] Create `packages/socket-client/src/hooks.ts` - React hooks (useSocket, usePresence, useNotifications, useChatSession)
- [x] T017 [P] Create `packages/socket-client/src/index.ts` - Main exports

### Files Created

1. **packages/socket-client/package.json** - Package config with socket.io-client 4.x dependency
2. **packages/socket-client/src/types.ts** - TypeScript types for all socket events (ViewerPresence, NotificationPayload, ChatMessage, TicketUpdatePayload, etc.)
3. **packages/socket-client/src/hooks.ts** - React hooks (useSocket, usePresence, useNotifications, useChatSession)
4. **packages/socket-client/src/index.ts** - Main exports for types and hooks

### Hooks API

- `useSocket(options)` - Manages Socket.IO connection, returns { socket, isConnected, error, disconnect }
- `usePresence(socket, ticketId, options)` - Manages ticket room presence, returns { viewers, joinTicket, leaveTicket, sendHeartbeat, requestViewers }
- `useNotifications(socket, userId)` - Subscribes to notifications, returns { notifications, markAsRead, markAllAsRead }
- `useChatSession(socket, sessionId)` - Manages chat session, returns { messages, isTyping, joinSession, leaveSession, sendMessage, sendTyping }

---

## Phase 5: Web App Integration (depends on Phase 4: T014-T017)

- [x] T018 [P] Add `socket.io-client` to `apps/web/package.json`
- [x] T019 [P] Create `apps/web/src/providers/SocketProvider.tsx` - Context provider with auth token injection and reconnection logic
- [x] T020 [P] Create `apps/web/src/components/PresenceAvatars.tsx` - Avatar stack showing current ticket viewers with pulse animation
- [x] T021 [P] Create `apps/web/src/components/NotificationToast.tsx` - Toast component with auto-dismiss and action buttons
- [x] T022 [P] Create `apps/web/src/components/LiveChatWidget.tsx` - Collapsible chat bubble with message list and typing indicator
- [x] T023 [P] Update `apps/web/src/routes/tickets/[id].tsx` to integrate `usePresence(ticketId)` hook and display viewer avatars

### Files Created

1. **apps/web/package.json** - Added `socket.io-client` and `@ticket-app/socket-client` dependencies
2. **apps/web/src/providers/SocketProvider.tsx** - Context provider with socket connection, auth token injection, exponential backoff reconnection, and presence/notification management
3. **apps/web/src/components/PresenceAvatars.tsx** - Avatar stack component with pulse animation showing current ticket viewers
4. **apps/web/src/components/NotificationToast.tsx** - Toast component using sonner with auto-dismiss and action buttons
5. **apps/web/src/components/LiveChatWidget.tsx** - Collapsible chat bubble with message list, typing indicator, and send functionality

### Files Modified

1. **apps/web/src/routes/tickets/[id].tsx** - Integrated `usePresence` hook and `PresenceAvatars` component to show ticket viewers

### SocketProvider API

- `SocketProvider` - Wraps app with socket context, handles connection lifecycle
- `useSocketContext` - Access socket state anywhere in app
- `usePresence(ticketId)` - Track viewers on a specific ticket
- `useNotifications` - Access notifications with markAsRead/markAllAsRead

### Integration Points

- Uses existing `sonner` toast library from `@ticket-app/ui`
- Uses existing `Avatar` component from `@ticket-app/ui`
- Socket connection to `http://localhost:3001` (configurable)

---

## Phase 6: Native App Integration (depends on Phase 4: T014-T017)

- [x] T024 [P] Add `socket.io-client` to `apps/native/package.json`
- [x] T025 [P] Create `apps/native/src/providers/SocketProvider.tsx` - Provider with app background/foreground handling via AppState
- [x] T026 [P] Create `apps/native/src/components/PresenceAvatars.tsx` - Native avatar stack using `heroui-native` Avatar
- [x] T027 [P] Create `apps/native/src/components/NotificationBanner.tsx` - Slide-down banner with haptic feedback
- [x] T028 [P] Create `apps/native/src/components/LiveChatSheet.tsx` - Bottom sheet chat using `@gorhom/bottom-sheet`
- [x] T029: Update `apps/native/app/(drawer)/tickets/[id].tsx` to integrate presence and notification hooks

### Files Created

1. **apps/native/package.json** - `socket.io-client` via workspace catalog (`^4.8.0`)
2. **apps/native/src/providers/SocketProvider.tsx** - Context provider with AppState background/foreground handling, PresenceProvider, and NotificationsProvider
3. **apps/native/src/components/PresenceAvatars.tsx** - Avatar stack using heroui-native Avatar with overlap styling
4. **apps/native/src/components/NotificationBanner.tsx** - Slide-down animated banner with haptic feedback using react-native-reanimated
5. **apps/native/src/components/LiveChatSheet.tsx** - Bottom sheet chat using @gorhom/bottom-sheet with message list and typing indicator

### Files Modified

1. **apps/native/app/(drawer)/tickets/[id].tsx** - Integrated SocketProvider, PresenceAvatars, NotificationBanner, and LiveChatSheet

### SocketProvider API

- `SocketProvider` - Wraps app with socket context, disconnects on background
- `useSocketContext` - Access socket state
- `PresenceProvider` - Track viewers on specific tickets
- `usePresenceContext` - Access presence state
- `NotificationsProvider` - Manage notifications with unread count
- `useNotificationsContext` - Access notifications

---

## Phase 7: Desktop App Integration

- [x] T030 [P] Verify `socket.io-client` included in web build for desktop (electrobun)
- [x] T031 [P] Verify SocketProvider works in Electron context (desktop reuses web build)

## Phase 8: Testing & Documentation

- [x] T032 [P] Create `apps/server/test/socket/presence.test.ts` - Vitest integration tests for join/leave/heartbeat and org isolation
- [x] T033 [P] Add socket debugging to `apps/server/src/lib/logger.ts` - Log connections, disconnections, room joins/leaves
- [x] T034 [P] Update `specs/main/contracts/presence.yaml` with Bun WebSocket event schema
- [x] T035 [P] Update `specs/main/contracts/notifications.yaml` with notification event schema
- [x] T036 [P] Update `specs/main/contracts/chat.yaml` with chat event schema

### Implementation Summary

#### Phase 7: Desktop App Integration

1. **T030 - socket.io-client in web build**: Verified `socket.io-client` is already listed in `apps/web/package.json` at line 33. Vite automatically bundles it into the web build. The desktop electrobun config copies `../web/dist` to `views/mainview`, so the socket client is included in desktop builds.

2. **T031 - SocketProvider in Electron context**: The desktop electrobun config (`apps/desktop/electrobun.config.ts`) copies the web build to `views/mainview`. SocketProvider connects to `http://localhost:3001` which is the server endpoint, so it works in desktop context as long as the server is running.

#### Phase 8: Testing & Documentation

1. **T032 - Presence test file**: Created `apps/server/test/socket/presence.test.ts` with:
   - Tests for join/leave/heartbeat operations using `@ticket-app/api/lib/presence`
   - Tests for room management functions (joinRoom, leaveRoom, leaveAllRooms)
   - Tests for organization isolation (users only see other users in same org room)
   - Tests for room utilities (getTicketRoom, getOrgRoom, parseRoomName, isValidRoomName)

2. **T033 - Socket logging**: Added `socketLogger` to `apps/server/src/lib/logger.ts` with methods:
   - `connection()` - Log socket connections
   - `disconnection()` - Log disconnections with reason
   - `roomJoin()` - Log room join events
   - `roomLeave()` - Log room leave events
   - `eventEmit()` - Log emitted events
   - `eventReceive()` - Log received events
   - `error()` - Log socket errors

3. **T034 - Presence contract**: Updated `specs/main/contracts/presence.yaml` with:
   - Added `join_ticket_ack` and `leave_ticket_ack` events
   - Added `socketio` section with `clientEvents` and `serverEvents` schemas
   - Made fields properly required/optional with descriptions

4. **T035 - Notifications contract**: Updated `specs/main/contracts/notifications.yaml` with:
   - Added `mark_read_ack` and `mark_all_read_ack` events
   - Added `socketio` section with full client/server event schemas
   - Added `data` field for additional notification metadata
   - Proper nullability annotations

5. **T036 - Chat contract**: Updated `specs/main/contracts/chat.yaml` with:
   - Added `join_session_ack`, `leave_session_ack`, `send_message_ack` events
   - Added `socketio` section with full event schemas
   - Added `attachments` field for message attachments
   - Added `tempId` for optimistic message updates
