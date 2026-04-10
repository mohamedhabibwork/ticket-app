# Data Model: Real-time Socket System

**Date**: 2026-04-09 | **Source**: Implementation plan for socket system
**Storage**: Redis (presence, pub/sub) | **No new database tables required**

---

## Socket Event Types

### Presence Events

| Event Name      | Direction       | Payload                | Description                    |
| --------------- | --------------- | ---------------------- | ------------------------------ |
| `join_ticket`   | Client → Server | `{ ticketId: number }` | Request to join ticket room    |
| `leave_ticket`  | Client → Server | `{ ticketId: number }` | Request to leave ticket room   |
| `heartbeat`     | Client → Server | `{ ticketId: number }` | Presence heartbeat (every 15s) |
| `get_viewers`   | Client → Server | `{ ticketId: number }` | Request current viewer list    |
| `viewer_joined` | Server → Client | `ViewerPresence`       | Broadcast when viewer joins    |
| `viewer_left`   | Server → Client | `{ userId: number }`   | Broadcast when viewer leaves   |
| `viewers_list`  | Server → Client | `ViewerPresence[]`     | Response to get_viewers        |
| `heartbeat_ack` | Server → Client | `{}`                   | Acknowledgment to heartbeat    |

### Notification Events

| Event Name          | Direction       | Payload                      | Description               |
| ------------------- | --------------- | ---------------------------- | ------------------------- |
| `notification`      | Server → Client | `NotificationPayload`        | Push notification to user |
| `mark_read`         | Client → Server | `{ notificationId: number }` | Mark notification as read |
| `notification_read` | Server → Client | `{ notificationId: number }` | Broadcast read status     |

### Chat Events

| Event Name         | Direction       | Payload                                    | Description                |
| ------------------ | --------------- | ------------------------------------------ | -------------------------- |
| `join_session`     | Client → Server | `{ sessionId: number }`                    | Join chat session room     |
| `leave_session`    | Client → Server | `{ sessionId: number }`                    | Leave chat session room    |
| `send_message`     | Client → Server | `ChatMessageInput`                         | Send chat message          |
| `message_received` | Server → Client | `ChatMessage`                              | Broadcast new message      |
| `typing_start`     | Client → Server | `{ sessionId: number }`                    | User started typing        |
| `typing_stop`      | Client → Server | `{ sessionId: number }`                    | User stopped typing        |
| `user_typing`      | Server → Client | `{ userId: number, userName: string }`     | Broadcast typing indicator |
| `mark_read`        | Client → Server | `{ sessionId: number, messageId: number }` | Mark message as read       |
| `messages_read`    | Server → Client | `{ userId: number, messageId: number }`    | Broadcast read status      |

### Domain Events (Server-initiated)

| Event Name              | Direction       | Payload                 | Description              |
| ----------------------- | --------------- | ----------------------- | ------------------------ |
| `ticket_updated`        | Server → Client | `TicketUpdatePayload`   | Ticket was modified      |
| `ticket_created`        | Server → Client | `TicketCreatePayload`   | New ticket created       |
| `ticket_assigned`       | Server → Client | `TicketAssignedPayload` | Ticket was assigned      |
| `ticket_status_changed` | Server → Client | `TicketStatusPayload`   | Ticket status changed    |
| `message_added`         | Server → Client | `MessageAddedPayload`   | New reply/note on ticket |

---

## TypeScript Interfaces

```typescript
// packages/socket-client/src/types.ts

export interface ViewerPresence {
  ticketId: number;
  userId: number;
  userName: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface NotificationPayload {
  id: number;
  type: "ticket_assigned" | "ticket_updated" | "mention" | "system";
  title: string;
  body: string;
  ticketId?: number;
  createdAt: string;
  read: boolean;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface ChatMessageInput {
  sessionId: number;
  body: string;
}

export interface TicketUpdatePayload {
  ticketId: number;
  organizationId: number;
  updatedBy: number;
  changes: Record<string, { old: unknown; new: unknown }>;
  updatedAt: string;
}

export interface TicketCreatePayload {
  ticket: {
    id: number;
    referenceNumber: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
  };
  organizationId: number;
}

export interface TicketAssignedPayload {
  ticketId: number;
  assignedTo: number;
  assignedBy: number;
  organizationId: number;
}

export interface TicketStatusPayload {
  ticketId: number;
  oldStatus: string;
  newStatus: string;
  organizationId: number;
}

export interface MessageAddedPayload {
  ticketId: number;
  message: {
    id: number;
    authorName: string;
    messageType: "reply" | "note";
    bodyPreview: string;
    createdAt: string;
  };
  organizationId: number;
}
```

---

## Room Structure

### Room Naming Convention

| Room Pattern        | Example      | Purpose                 | Access Control             |
| ------------------- | ------------ | ----------------------- | -------------------------- |
| `org:{orgId}`       | `org:123`    | Org-wide broadcasts     | Authenticated users in org |
| `ticket:{ticketId}` | `ticket:456` | Ticket presence/updates | Authenticated users in org |
| `user:{userId}`     | `user:789`   | Private notifications   | Specific user only         |
| `chat:{sessionId}`  | `chat:101`   | Chat session messages   | Session participants       |

### Room Join Flow

```
Client                          Server
  |                                |
  |-------- join_ticket ---------->|
  |    { ticketId: 123 }          |
  |                                |-- Validate user in org
  |                                |-- Add socket to room
  |                                |-- Broadcast viewer_joined
  |<------- viewer_joined ---------|   to room members
  |    { ticketId, userId, ... }  |
  |                                |
```

---

## Redis Key Patterns

### Presence (existing, reused)

| Key Pattern                           | Type   | TTL | Purpose                        |
| ------------------------------------- | ------ | --- | ------------------------------ |
| `presence:ticket:{ticketId}`          | SET    | -   | Set of user IDs viewing ticket |
| `presence:viewer:{ticketId}:{userId}` | STRING | 30s | Presence data with TTL         |

### Socket.io Adapter (new)

| Key Pattern                     | Type    | Purpose                   |
| ------------------------------- | ------- | ------------------------- |
| `socket.io/#-org:{orgId}`       | Channel | Org room broadcasts       |
| `socket.io/#-ticket:{ticketId}` | Channel | Ticket room broadcasts    |
| `socket.io/#-user:{userId}`     | Channel | User notification channel |
| `socket.io/#-chat:{sessionId}`  | Channel | Chat session broadcasts   |

### Socket Events Pub/Sub (new)

| Channel         | Purpose                             |
| --------------- | ----------------------------------- |
| `socket:events` | Server-initiated event distribution |

---

## Authentication Flow

```
Client                          Server
  |                                |
  |  Socket connection handshake    |
  |  with token in query:          |
  |  ?token=<jwt>                 |
  |                                |-- Extract token
  |                                |-- Validate JWT
  |                                |-- Extract userId, orgId
  |                                |-- Attach to socket.data
  |                                |
  |  Connection accepted/rejected   |
```

### Socket.io Auth Middleware

```typescript
// apps/server/src/socket/auth.ts

interface AuthData {
  userId: number;
  organizationId: number;
  email: string;
}

socket.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = verifyJWT(token);
    socket.data.auth = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      email: payload.email,
    } as AuthData;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});
```

---

## Event Authorization Rules

| Event          | Required Permission                 |
| -------------- | ----------------------------------- |
| `join_ticket`  | User in same organization as ticket |
| `leave_ticket` | User already in room                |
| `heartbeat`    | User in room                        |
| `send_message` | User is chat session participant    |
| `join_session` | User is chat session participant    |

---

## Dependencies

- `socket.io` 4.x - WebSocket server
- `@socket.io/redis-adapter` - Redis adapter for scaling
- `socket.io-client` 4.x - Client libraries
- `ioredis` - Already in use for presence
