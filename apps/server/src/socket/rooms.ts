export const ROOM_TYPES = {
  ORG: "org",
  TICKET: "ticket",
  USER: "user",
  CHAT: "chat",
} as const;

export type RoomType = (typeof ROOM_TYPES)[keyof typeof ROOM_TYPES];

export function getRoomName(type: RoomType, id: number | string): string {
  return `${type}:${id}`;
}

export function getOrgRoom(orgId: number): string {
  return getRoomName(ROOM_TYPES.ORG, orgId);
}

export function getTicketRoom(ticketId: number): string {
  return getRoomName(ROOM_TYPES.TICKET, ticketId);
}

export function getUserRoom(userId: number): string {
  return getRoomName(ROOM_TYPES.USER, userId);
}

export function getChatRoom(sessionId: number): string {
  return getRoomName(ROOM_TYPES.CHAT, sessionId);
}

export function parseRoomName(room: string): { type: RoomType; id: string } | null {
  const parts = room.split(":");
  if (parts.length !== 2) return null;

  const [type, id] = parts;
  if (!Object.values(ROOM_TYPES).includes(type as RoomType)) {
    return null;
  }

  return { type: type as RoomType, id };
}

export function isValidRoomName(room: string): boolean {
  return parseRoomName(room) !== null;
}
