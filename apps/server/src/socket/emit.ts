import type { Server as SocketIOServer } from "socket.io";

interface UserRoomMapping {
  [userId: number]: Set<string>;
}

interface RoomUserMapping {
  [room: string]: Set<number>;
}

const userRooms: UserRoomMapping = {};
const roomUsers: RoomUserMapping = {};

export function joinRoom(userId: number, room: string): void {
  if (!userRooms[userId]) {
    userRooms[userId] = new Set();
  }
  userRooms[userId].add(room);

  if (!roomUsers[room]) {
    roomUsers[room] = new Set();
  }
  roomUsers[room].add(userId);
}

export function leaveRoom(userId: number, room: string): void {
  if (userRooms[userId]) {
    userRooms[userId].delete(room);
  }

  if (roomUsers[room]) {
    roomUsers[room].delete(userId);
    if (roomUsers[room].size === 0) {
      delete roomUsers[room];
    }
  }
}

export function leaveAllRooms(userId: number): string[] {
  const rooms = Array.from(userRooms[userId] || []);
  for (const room of rooms) {
    leaveRoom(userId, room);
  }
  delete userRooms[userId];
  return rooms;
}

export function getUserRooms(userId: number): string[] {
  return Array.from(userRooms[userId] || []);
}

export function getRoomUsers(room: string): number[] {
  return Array.from(roomUsers[room] || []);
}

export function isUserInRoom(userId: number, room: string): boolean {
  return userRooms[userId]?.has(room) || false;
}

export function getRoomCount(room: string): number {
  return roomUsers[room]?.size || 0;
}

export function getUserCount(userId: number): number {
  return userRooms[userId]?.size || 0;
}

export function emitToUser(io: SocketIOServer, userId: number, event: string, data: unknown): void {
  const room = `user:${userId}`;
  io.to(room).emit(event, data);
}

export function emitToTicket(
  io: SocketIOServer,
  ticketId: number,
  event: string,
  data: unknown,
): void {
  const room = `ticket:${ticketId}`;
  io.to(room).emit(event, data);
}

export function emitToOrg(io: SocketIOServer, orgId: number, event: string, data: unknown): void {
  const room = `org:${orgId}`;
  io.to(room).emit(event, data);
}

export function emitToChat(
  io: SocketIOServer,
  sessionId: number,
  event: string,
  data: unknown,
): void {
  const room = `chat:${sessionId}`;
  io.to(room).emit(event, data);
}

export function broadcastToRoom(
  io: SocketIOServer,
  room: string,
  event: string,
  data: unknown,
  excludeUserId?: number,
): void {
  const users = getRoomUsers(room);
  for (const userId of users) {
    if (excludeUserId && userId === excludeUserId) continue;
    emitToUser(io, userId, event, data);
  }
}
