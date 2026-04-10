import { getRedis } from "./redis";

const SOCKET_EVENTS_CHANNEL = "socket:events";

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

export async function publishSocketEvent(event: SocketEventMessage): Promise<void> {
  const redis = getRedis();
  await redis.publish(SOCKET_EVENTS_CHANNEL, JSON.stringify(event));
}

export function publishTicketCreated(
  ticketId: number,
  orgId: number,
  data: unknown,
): Promise<void> {
  return publishSocketEvent({
    event: "ticket:created",
    roomType: "ticket",
    roomId: ticketId,
    ticketId,
    orgId,
    data,
  });
}

export function publishTicketUpdated(
  ticketId: number,
  orgId: number,
  data: unknown,
): Promise<void> {
  return publishSocketEvent({
    event: "ticket:updated",
    roomType: "ticket",
    roomId: ticketId,
    ticketId,
    orgId,
    data,
  });
}

export function publishTicketAssigned(
  ticketId: number,
  orgId: number,
  assignedAgentId: number | null,
  assignedTeamId: number | null,
  data: unknown,
): Promise<void> {
  return publishSocketEvent({
    event: "ticket:assigned",
    roomType: "ticket",
    roomId: ticketId,
    ticketId,
    orgId,
    data: {
      ...(data as object),
      assignedAgentId,
      assignedTeamId,
    },
  });
}

export function publishUserNotification(
  userId: number,
  event: string,
  data: unknown,
): Promise<void> {
  return publishSocketEvent({
    event,
    roomType: "user",
    roomId: userId,
    userId,
    data,
  });
}

export function publishOrgNotification(orgId: number, event: string, data: unknown): Promise<void> {
  return publishSocketEvent({
    event,
    roomType: "org",
    roomId: orgId,
    orgId,
    data,
  });
}
