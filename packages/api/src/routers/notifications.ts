import { eq, and } from "drizzle-orm";
import { db } from "@ticket-app/db";
import { users, notifications } from "@ticket-app/db/schema";
import {
  NOTIFICATION_TYPES,
  updateUserNotificationPreferences,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../services/notifications";
import { verifyUnsubscribeToken } from "../services/notificationEmail";
import { publicProcedure } from "../index";
import * as z from "zod";

export const notificationsRouter = {
  unsubscribe: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        type: z.string(),
        token: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      const { userId, type, token } = input;

      const isValid = verifyUnsubscribeToken(userId, type, token);

      if (!isValid) {
        return { success: false, error: "Invalid unsubscribe token" };
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      if (type === "all") {
        await updateUserNotificationPreferences(userId, {
          channels: {
            email: false,
            slack: false,
            push: false,
          },
        });
        return {
          success: true,
          message: "You have been unsubscribed from all email notifications",
        };
      }

      if (type === "digest") {
        await updateUserNotificationPreferences(userId, {
          emailDigest: false,
        });
        return { success: true, message: "You have been unsubscribed from email digests" };
      }

      const validTypes = Object.values(NOTIFICATION_TYPES);
      if (!validTypes.includes(type as any)) {
        return { success: false, error: "Invalid notification type" };
      }

      const prefs = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      const existingMeta = (prefs?.metadata as Record<string, unknown>) || {};
      const notificationTypes = (existingMeta.notificationTypes as Record<string, boolean>) || {};

      notificationTypes[type] = false;

      await updateUserNotificationPreferences(userId, {
        types: notificationTypes as any,
      });

      return { success: true, message: `You have been unsubscribed from ${type} notifications` };
    }),

  getPreferences: publicProcedure
    .input(
      z.object({
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const { userId } = input;

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return null;
      }

      const existingMeta = (user.metadata as Record<string, unknown>) || {};

      return {
        emailDigest: existingMeta.emailDigest ?? true,
        inAppEnabled: existingMeta.inAppEnabled ?? true,
        channels: existingMeta.notificationChannels ?? {
          email: true,
          slack: false,
          push: false,
        },
        types: existingMeta.notificationTypes ?? {
          ticket_assigned: true,
          ticket_updated: true,
          mention: true,
          system_alert: true,
          sla_breach: true,
          chat_request: true,
          subscription_alert: true,
        },
      };
    }),

  updatePreferences: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        emailDigest: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
        channels: z
          .object({
            email: z.boolean().optional(),
            slack: z.boolean().optional(),
            push: z.boolean().optional(),
          })
          .optional(),
        types: z.record(z.string(), z.boolean()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { userId, ...prefs } = input;

      await updateUserNotificationPreferences(userId, prefs as any);

      return { success: true };
    }),

  deletePreferences: publicProcedure
    .input(
      z.object({
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      await updateUserNotificationPreferences(input.userId, {
        emailDigest: true,
        inAppEnabled: true,
        channels: {
          email: true,
          slack: false,
          push: false,
        },
        types: {
          [NOTIFICATION_TYPES.TICKET_ASSIGNED]: true,
          [NOTIFICATION_TYPES.TICKET_UPDATED]: true,
          [NOTIFICATION_TYPES.MENTION]: true,
          [NOTIFICATION_TYPES.SYSTEM_ALERT]: true,
          [NOTIFICATION_TYPES.SLA_BREACH]: true,
          [NOTIFICATION_TYPES.CHAT_REQUEST]: true,
          [NOTIFICATION_TYPES.SUBSCRIPTION_ALERT]: true,
        },
      });

      return { success: true };
    }),

  listNotifications: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        unreadOnly: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!user) {
        return { notifications: [], total: 0 };
      }

      const results = await getUserNotifications(input.userId, {
        limit: input.limit,
        offset: input.offset,
        unreadOnly: input.unreadOnly,
      });

      const countResult = await db
        .select({ count: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, input.userId),
            input.unreadOnly ? eq(notifications.isRead, false) : undefined,
          ),
        );

      return {
        notifications: results,
        total: Number(countResult[0]?.count || 0),
      };
    }),

  getNotification: publicProcedure
    .input(
      z.object({
        id: z.number(),
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const notification = await db.query.notifications.findFirst({
        where: and(eq(notifications.id, input.id), eq(notifications.userId, input.userId)),
      });

      return notification;
    }),

  markAsRead: publicProcedure
    .input(
      z.object({
        id: z.number(),
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      await markNotificationAsRead(input.id, input.userId);
      return { success: true };
    }),

  markAllAsRead: publicProcedure
    .input(
      z.object({
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      await markAllNotificationsAsRead(input.userId);
      return { success: true };
    }),

  deleteNotification: publicProcedure
    .input(
      z.object({
        id: z.number(),
        userId: z.number(),
      }),
    )
    .handler(async ({ input }) => {
      const notification = await db.query.notifications.findFirst({
        where: and(eq(notifications.id, input.id), eq(notifications.userId, input.userId)),
      });

      if (!notification) {
        return { success: false, error: "Notification not found" };
      }

      await deleteNotification(input.id);
      return { success: true };
    }),
};
