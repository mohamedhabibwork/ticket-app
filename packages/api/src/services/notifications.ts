import { eq, and, desc } from "drizzle-orm";
import { db } from "@ticket-app/db";
import { notifications, notificationChannels, users, organizations } from "@ticket-app/db/schema";
import { addNotificationJob } from "@ticket-app/db/lib/queues";

export const NOTIFICATION_TYPES = {
  TICKET_ASSIGNED: "ticket_assigned",
  TICKET_UPDATED: "ticket_updated",
  MENTION: "mention",
  SYSTEM_ALERT: "system_alert",
  SLA_BREACH: "sla_breach",
  CHAT_REQUEST: "chat_request",
  SUBSCRIPTION_ALERT: "subscription_alert",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export interface CreateNotificationParams {
  userId: number;
  organizationId: number;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<{ id: number; uuid: string }> {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      organizationId: params.organizationId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data,
    })
    .returning({ id: notifications.id, uuid: notifications.uuid });

  await addNotificationJob({
    userId: params.userId.toString(),
    type: params.type,
    title: params.title,
    message: params.body || params.title,
    metadata: {
      ...params.data,
      organizationId: params.organizationId,
    },
  });

  return notification;
}

export async function createTeamNotification(
  teamId: number,
  organizationId: number,
  params: Omit<CreateNotificationParams, "userId" | "organizationId">,
): Promise<void> {
  const teamMembers = await db.query.teamMembers.findMany({
    where: eq(db.query.teamMembers.baseTable.teamId, teamId),
    with: { user: true },
  });

  await Promise.all(
    teamMembers.map((member) =>
      createNotification({
        userId: member.userId,
        organizationId,
        ...params,
      }),
    ),
  );
}

export async function getUserNotifications(
  userId: number,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
) {
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  return db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(notifications.createdAt)],
    limit,
    offset,
  });
}

export async function markNotificationAsRead(
  notificationId: number,
  userId: number,
): Promise<void> {
  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const result = await db
    .select({ count: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result.length;
}

export interface NotificationPreferences {
  emailDigest: boolean;
  inAppEnabled: boolean;
  channels: {
    email: boolean;
    slack: boolean;
    push: boolean;
  };
  types: Record<NotificationType, boolean>;
}

export async function getUserNotificationPreferences(
  userId: number,
): Promise<NotificationPreferences | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return null;

  const _channels = await db.query.notificationChannels.findMany({
    where: eq(notificationChannels.userId, userId),
  });

  const defaultPrefs: NotificationPreferences = {
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
  };

  if (!user.metadata || typeof user.metadata !== "object") {
    return defaultPrefs;
  }

  const metadata = user.metadata as Record<string, unknown>;

  return {
    emailDigest: (metadata.emailDigest as boolean) ?? defaultPrefs.emailDigest,
    inAppEnabled: (metadata.inAppEnabled as boolean) ?? defaultPrefs.inAppEnabled,
    channels:
      (metadata.notificationChannels as NotificationPreferences["channels"]) ??
      defaultPrefs.channels,
    types: (metadata.notificationTypes as Record<NotificationType, boolean>) ?? defaultPrefs.types,
  };
}

export async function updateUserNotificationPreferences(
  userId: number,
  prefs: Partial<NotificationPreferences>,
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return;

  const existingMeta = (user.metadata as Record<string, unknown>) || {};
  const updatedMeta = { ...existingMeta, ...prefs };

  await db.update(users).set({ metadata: updatedMeta }).where(eq(users.id, userId));
}

export async function registerNotificationChannel(
  userId: number,
  channel: "email" | "slack" | "push",
  endpoint: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db
    .insert(notificationChannels)
    .values({
      userId,
      channel,
      endpoint,
      metadata,
    })
    .onConflictDoUpdate({
      target: [notificationChannels.userId, notificationChannels.channel],
      set: {
        endpoint,
        metadata,
        updatedAt: new Date(),
      },
    });
}

export async function getSlackWebhookUrl(organizationId: number): Promise<string | null> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org || !org.metadata || typeof org.metadata !== "object") {
    return null;
  }

  const metadata = org.metadata as Record<string, unknown>;
  return (metadata.slackWebhookUrl as string) || null;
}

export async function setSlackWebhookUrl(
  organizationId: number,
  webhookUrl: string,
): Promise<void> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org) return;

  const existingMeta = (org.metadata as Record<string, unknown>) || {};
  await db
    .update(organizations)
    .set({ metadata: { ...existingMeta, slackWebhookUrl: webhookUrl } })
    .where(eq(organizations.id, organizationId));
}

export async function deleteNotification(notificationId: number): Promise<void> {
  await db.delete(notifications).where(eq(notifications.id, notificationId));
}

export async function deleteOldNotifications(
  userId: number,
  olderThanDays: number = 30,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await db
    .delete(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, true)));

  return result.rowCount;
}
