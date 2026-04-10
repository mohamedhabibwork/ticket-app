import { createClient, type RedisClientType } from "redis";
import { env } from "@ticket-app/env/server";
import { getSocketServer } from "./index";
import { emitToUser, emitToTicket, emitToOrg, emitToChat } from "./emit";

const REDIS_URL = env.REDIS_URL;
const SOCKET_EVENTS_CHANNEL = "socket:events";

let subscriber: RedisClientType | null = null;

export interface SocketEventMessage {
  event: string;
  roomType?: "user" | "ticket" | "org" | "chat";
  roomId?: string | number;
  userId?: number;
  ticketId?: number;
  orgId?: number;
  sessionId?: number;
  data: unknown;
}

export async function initializeSocketPubSub(): Promise<void> {
  if (subscriber) {
    return;
  }

  subscriber = createClient({ url: REDIS_URL }) as RedisClientType;

  subscriber.on("error", (err: Error) => {
    console.error("Socket pub/sub subscriber error:", err);
  });

  await subscriber.connect();

  await subscriber.subscribe(SOCKET_EVENTS_CHANNEL, (message) => {
    try {
      const event: SocketEventMessage = JSON.parse(message);
      handleSocketEvent(event);
    } catch (err) {
      console.error("Failed to parse socket event message:", err);
    }
  });

  console.log("Socket pub/sub subscriber initialized");
}

function handleSocketEvent(event: SocketEventMessage): void {
  const io = getSocketServer();

  if (!io) {
    console.warn("Socket server not initialized, cannot emit event");
    return;
  }

  const { event: eventName, roomType, roomId, userId, ticketId, orgId, sessionId, data } = event;

  if (userId) {
    emitToUser(io, userId, eventName, data);
    return;
  }

  if (ticketId) {
    emitToTicket(io, ticketId, eventName, data);
    return;
  }

  if (orgId) {
    emitToOrg(io, orgId, eventName, data);
    return;
  }

  if (sessionId) {
    emitToChat(io, sessionId, eventName, data);
    return;
  }

  if (roomType && roomId !== undefined) {
    const room = `${roomType}:${roomId}`;
    io.to(room).emit(eventName, data);
  }
}

export async function closeSocketPubSub(): Promise<void> {
  if (subscriber) {
    await subscriber.unsubscribe(SOCKET_EVENTS_CHANNEL);
    await subscriber.quit();
    subscriber = null;
    console.log("Socket pub/sub subscriber closed");
  }
}

export function isSocketPubSubInitialized(): boolean {
  return subscriber !== null;
}
