# Quickstart: Real-time Socket System

**Date**: 2026-04-09 | **Status**: Development Guide

---

## Prerequisites

| Tool             | Version | Installation                     |
| ---------------- | ------- | -------------------------------- |
| Node.js          | 20+     | [nodejs.org](https://nodejs.org) |
| Bun              | 1.3+    | [bun.sh](https://bun.sh)         |
| Redis            | 7+      | [redis.io](https://redis.io)     |
| Socket.io Client | 4.x     | Via bun/npm                      |

---

## Local Development Setup

### 1. Start Redis

Socket.io Redis adapter requires a running Redis instance:

```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or locally installed
redis-server
```

### 2. Verify Redis Connection

```bash
redis-cli ping
# Should return: PONG
```

### 3. Start the Server

```bash
cd apps/server
bun run dev
```

The server starts on port 3000 with Socket.io available at `/socket.io/`.

---

## Socket.io Client Setup

### Web App

```bash
cd apps/web
bun install socket.io-client@^4.0.0
```

### Native App

```bash
cd apps/native
bun install socket.io-client@^4.0.0
```

---

## Connecting to Socket.io

### Basic Connection

```typescript
import { io, Socket } from "socket.io-client";

const socket: Socket = io("http://localhost:3000", {
  auth: {
    token: "your-jwt-token",
  },
  transports: ["websocket"],
  autoConnect: true,
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});
```

### With React Hook

```typescript
import { useSocket, SocketProvider } from '@ticket-app/socket-client';

// In your app
function App() {
  return (
    <SocketProvider url="http://localhost:3000" authToken={token}>
      <YourApp />
    </SocketProvider>
  );
}

// In a component
function TicketPresence({ ticketId }: { ticketId: number }) {
  const { viewers, isConnected } = usePresence(ticketId);

  return (
    <div>
      {isConnected ? 'Connected' : 'Disconnected'}
      {viewers.map(v => (
        <span key={v.userId}>{v.userName}</span>
      ))}
    </div>
  );
}
```

---

## Testing Presence Events

### Terminal Testing (using websocat)

```bash
# Install websocat
brew install websocat  # macOS
# or: cargo install websocat

# Connect to socket
websocat ws://localhost:3000/socket.io/?transport=websocket&EIO=4

# Send presence join (manually craft the Socket.io protocol)
# Note: Manual Socket.io protocol testing is complex
# Recommend using the client library instead
```

### Using the Socket.io CLI

```bash
# Install socket.io-client CLI
npm install -g socket.io-client

# Connect to server
sio connect http://localhost:3000
```

---

## Debugging Socket.io

### Enable Debug Logging

```typescript
// In your client
import debug from "debug";

const log = debug("socket.io-client");
log.enabled = true;
```

### Server-Side Logging

The server logs socket connections and events:

```bash
# Server logs show:
# - WebSocket opened
# - WebSocket closed
# - Room join/leave events
# - Error events
```

### Inspect Traffic

- Chrome DevTools → Network → WS (WebSocket frames)
- Firefox DevTools → Network → Socket.io
- Safari DevTools → Timelines → WebSocket

---

## Common Issues

### CORS Error

```
Access to fetch at 'http://localhost:3000' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Fix**: Ensure `CORS_ORIGIN` in server `.env` includes your client origin.

### Redis Adapter Connection Failed

```
Error: Redis connection failed
```

**Fix**:

1. Verify Redis is running: `redis-cli ping`
2. Check `REDIS_URL` in server `.env`

### Authentication Failed

```
Invalid token
```

**Fix**:

1. Ensure JWT token is valid and not expired
2. Token must be passed in `auth.token` or `query.token`

### Transport Fallback

If WebSocket fails, Socket.io falls back to long-polling. This is expected behavior.

---

## Event Testing Checklist

- [ ] `join_ticket` → receives `viewer_joined` broadcast
- [ ] `leave_ticket` → receives `viewer_left` broadcast
- [ ] `heartbeat` → receives `heartbeat_ack`
- [ ] `get_viewers` → receives `viewers_list`
- [ ] Cross-tab presence works
- [ ] Reconnection after network interruption works
- [ ] Multiple users see same presence state

---

## Architecture Overview

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Web App   │◄──────────────────►│   Server    │
│             │                    │             │
│             │     Socket.io      │  ┌───────┐  │
│             │◄──────────────────►│  │ Redis │  │
└─────────────┘                    │  │Adapter│  │
                                 │  └───┬───┘  │
┌─────────────┐                   │      │      │
│Native App   │◄──────────────────►│      ▼      │
│             │                    │  ┌───────┐  │
└─────────────┘                    │  │ Redis │  │
                                 │  │ Pub/  │  │
┌─────────────┐                   │  │ Sub   │  │
│  Queue      │                   │  └───────┘  │
│  Workers    │───────────────────►             │
└─────────────┘    Redis Pub/Sub                │
                                                 │
                    ┌─────────────────────────────┘
                    │
                    ▼
              ┌───────────┐
              │  Redis    │
              │  Server   │
              └───────────┘
```

---

## Next Steps

1. Review [data-model.md](./data-model.md) for event type definitions
2. Review [research.md](./research.md) for architecture decisions
3. Check socket implementation in `apps/server/src/socket/`
4. Review client hooks in `packages/socket-client/src/`
