import { emitToUser } from "../emit";
import type { Server as SocketIOServer } from "socket.io";
import type { AuthenticatedUser } from "../auth";
import { redis } from "@ticket-app/api/lib/presence";

const NOTIFICATION_TTL = 86400;

export interface Notification {
  id: string;
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export async function markNotificationRead(
  userId: number,
  notificationId: string,
): Promise<boolean> {
  const key = `notification:${userId}:${notificationId}`;
  const exists = await redis.exists(key);

  if (!exists) {
    return false;
  }

  const notification = await redis.get(key);
  if (notification) {
    const data = JSON.parse(notification);
    data.read = true;
    await redis.setex(key, NOTIFICATION_TTL, JSON.stringify(data));
  }

  return true;
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const pattern = `notification:${userId}:*`;
  const keys = await redis.keys(pattern);

  for (const key of keys) {
    const notification = await redis.get(key);
    if (notification) {
      const data = JSON.parse(notification);
      data.read = true;
      await redis.setex(key, NOTIFICATION_TTL, JSON.stringify(data));
    }
  }
}

export async function broadcastNotification(
  io: SocketIOServer,
  userId: number,
  notification: Omit<Notification, "id" | "read" | "createdAt">,
): Promise<void> {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fullNotification: Notification = {
    ...notification,
    id,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const key = `notification:${userId}:${id}`;
  await redis.setex(key, NOTIFICATION_TTL, JSON.stringify(fullNotification));

  emitToUser(io, userId, "notification", fullNotification);
}

export async function broadcastOrgNotification(
  io: SocketIOServer,
  orgId: number,
  notification: Omit<Notification, "id" | "read" | "createdAt">,
): Promise<void> {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fullNotification: Notification = {
    ...notification,
    id,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const { emitToOrg } = await import("../emit");
  emitToOrg(io, orgId, "notification", fullNotification);
}

export function handleMarkRead(
  io: SocketIOServer,
  socket: any,
  user: AuthenticatedUser,
  payload: { notificationId: string },
): void {
  const { notificationId } = payload;

  markNotificationRead(user.userId, notificationId).then((success) => {
    socket.emit("mark_read_ack", { notificationId, success });
  });
}

export function handleMarkAllRead(io: SocketIOServer, socket: any, user: AuthenticatedUser): void {
  markAllNotificationsRead(user.userId).then(() => {
    socket.emit("mark_all_read_ack", { success: true });
  });
}

export function registerNotificationHandlers(io: SocketIOServer, socket: any): void {
  const user: AuthenticatedUser = socket.data.user;

  socket.on("mark_read", (payload: { notificationId: string }) => {
    handleMarkRead(io, socket, user, payload);
  });

  socket.on("mark_all_read", () => {
    handleMarkAllRead(io, socket, user);
  });
}
