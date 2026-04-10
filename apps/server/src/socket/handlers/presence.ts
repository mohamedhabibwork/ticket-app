import { joinTicket, leaveTicket, heartbeat, getTicketViewers } from "@ticket-app/api/lib/presence";
import { emitToTicket } from "../emit";
import type { Server as SocketIOServer } from "socket.io";
import type { AuthenticatedUser } from "../auth";

export interface PresenceEventHandlers {
  io: SocketIOServer;
  socket: any;
  user: AuthenticatedUser;
}

export function handleJoinTicket(
  io: SocketIOServer,
  socket: any,
  user: AuthenticatedUser,
  payload: { ticketId: number; userName: string; avatarUrl?: string },
): void {
  const { ticketId, userName, avatarUrl } = payload;

  joinTicket(ticketId, user.userId, userName, avatarUrl).then(() => {
    socket.join(`ticket:${ticketId}`);
    socket.data.rooms = socket.data.rooms || new Set();
    socket.data.rooms.add(`ticket:${ticketId}`);

    emitToTicket(io, ticketId, "viewer_joined", {
      ticketId,
      userId: user.userId,
      userName,
      avatarUrl,
      joinedAt: new Date().toISOString(),
    });

    socket.emit("join_ticket_ack", { ticketId, success: true });
  });
}

export function handleLeaveTicket(
  io: SocketIOServer,
  socket: any,
  user: AuthenticatedUser,
  payload: { ticketId: number },
): void {
  const { ticketId } = payload;

  leaveTicket(ticketId, user.userId).then(() => {
    socket.leave(`ticket:${ticketId}`);
    socket.data.rooms = socket.data.rooms || new Set();
    socket.data.rooms.delete(`ticket:${ticketId}`);

    emitToTicket(io, ticketId, "viewer_left", {
      ticketId,
      userId: user.userId,
    });

    socket.emit("leave_ticket_ack", { ticketId, success: true });
  });
}

export function handleHeartbeat(
  io: SocketIOServer,
  socket: any,
  user: AuthenticatedUser,
  payload: { ticketId: number },
): void {
  const { ticketId } = payload;

  heartbeat(ticketId, user.userId).then((isActive) => {
    if (!isActive) {
      handleJoinTicket(io, socket, user, {
        ticketId,
        userName: socket.data.userName || "Unknown",
        avatarUrl: socket.data.avatarUrl,
      });
    }
    socket.emit("heartbeat_ack", { ticketId, active: true });
  });
}

export function handleGetViewers(
  io: SocketIOServer,
  socket: any,
  user: AuthenticatedUser,
  payload: { ticketId: number },
): void {
  const { ticketId } = payload;

  getTicketViewers(ticketId).then((viewers) => {
    socket.emit("viewers_list", { ticketId, viewers });
  });
}

export function registerPresenceHandlers(io: SocketIOServer, socket: any): void {
  const user: AuthenticatedUser = socket.data.user;

  socket.on(
    "join_ticket",
    (payload: { ticketId: number; userName: string; avatarUrl?: string }) => {
      handleJoinTicket(io, socket, user, payload);
    },
  );

  socket.on("leave_ticket", (payload: { ticketId: number }) => {
    handleLeaveTicket(io, socket, user, payload);
  });

  socket.on("heartbeat", (payload: { ticketId: number }) => {
    handleHeartbeat(io, socket, user, payload);
  });

  socket.on("get_viewers", (payload: { ticketId: number }) => {
    handleGetViewers(io, socket, user, payload);
  });
}
