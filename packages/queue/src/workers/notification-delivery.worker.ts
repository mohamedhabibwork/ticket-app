import { Worker, Job, Queue } from "bullmq";
import { eq, and, isNull, sql, desc } from "drizzle-orm";

import { db } from "@ticket-app/db";
import {
  users,
  notifications,
  notificationChannels,
} from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";

const NOTIFICATION_DELIVERY_QUEUE = `${env.QUEUE_PREFIX}:notification-delivery`;

export interface NotificationDeliveryJobData {
  notificationId?: number;
  userId: number;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
  channel?: "push" | "email" | "sms";
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailDigest: "immediate" | "hourly" | "daily" | "never";
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const userRateLimits = new Map<number, RateLimitEntry>();

const NOTIFICATION_RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 60000;

const notificationDeliveryQueue = new Queue(NOTIFICATION_DELIVERY_QUEUE, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
});

export async function addNotificationJob(data: NotificationDeliveryJobData): Promise<Job<NotificationDeliveryJobData>> {
  return notificationDeliveryQueue.add("deliver-notification", data, {
    jobId: `notification-${data.userId}-${Date.now()}`,
  });
}

export async function scheduleEmailDigestBatch(intervalMs: number = 3600000): Promise<void> {
  await notificationDeliveryQueue.add(
    "email-digest-batch",
    {},
    {
      repeat: { every: intervalMs },
      jobId: "notification-email-digest-batch",
    }
  );
}

export function createNotificationDeliveryWorker(): Worker {
  return new Worker(
    NOTIFICATION_DELIVERY_QUEUE,
    async (job: Job<NotificationDeliveryJobData>) => {
      const { notificationId, userId, type, title, body, data, channel } = job.data;

      if (channel === "email") {
        await handleEmailNotification(userId, type, title, body, data);
        return { delivered: true, channel: "email" };
      }

      if (channel === "sms") {
        await handleSmsNotification(userId, type, title, body, data);
        return { delivered: true, channel: "sms" };
      }

      const prefs = await getUserPreferences(userId);

      if (isInQuietHours(prefs)) {
        console.log(`Notification for user ${userId} skipped due to quiet hours`);
        return { delivered: false, reason: "quiet_hours" };
      }

      if (!checkRateLimit(userId)) {
        console.log(`Notification for user ${userId} rate limited`);
        throw new Error("Rate limit exceeded, will retry");
      }

      const pushDelivered = prefs.pushEnabled ? await handlePushNotification(userId, type, title, body, data) : false;
      const emailDelivered = prefs.emailEnabled && prefs.emailDigest === "immediate" 
        ? await handleEmailNotification(userId, type, title, body, data) 
        : false;
      const smsDelivered = prefs.smsEnabled ? await handleSmsNotification(userId, type, title, body, data) : false;

      if (notificationId) {
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.id, notificationId));
      }

      return { 
        delivered: pushDelivered || emailDelivered || smsDelivered, 
        channels: { push: pushDelivered, email: emailDelivered, sms: smsDelivered } 
      };
    },
    {
      connection: getRedis(),
      concurrency: 10,
    }
  );
}

async function getUserPreferences(userId: number): Promise<NotificationPreferences> {
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.id, userId),
      eq(users.isActive, true),
      isNull(users.deletedAt)
    ),
  });

  if (!user) {
    return {
      pushEnabled: false,
      emailEnabled: true,
      smsEnabled: false,
      emailDigest: "immediate",
      timezone: "UTC",
    };
  }

  const pushChannel = await db.query.notificationChannels.findFirst({
    where: and(
      eq(notificationChannels.userId, userId),
      eq(notificationChannels.channel, "push"),
      eq(notificationChannels.isActive, true)
    ),
  });

  const smsChannel = await db.query.notificationChannels.findFirst({
    where: and(
      eq(notificationChannels.userId, userId),
      eq(notificationChannels.channel, "sms"),
      eq(notificationChannels.isActive, true)
    ),
  });

  const userPrefs = (user as any).notificationPreferences as NotificationPreferences | undefined;

  return {
    pushEnabled: !!pushChannel,
    emailEnabled: true,
    smsEnabled: !!smsChannel,
    emailDigest: userPrefs?.emailDigest || "immediate",
    quietHoursStart: userPrefs?.quietHoursStart,
    quietHoursEnd: userPrefs?.quietHoursEnd,
    timezone: user.timezone || "UTC",
  };
}

function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: prefs.timezone,
  });

  const currentTime = formatter.format(now);
  const start = prefs.quietHoursStart.padEnd(5, "0");
  const end = prefs.quietHoursEnd.padEnd(5, "0");

  if (start <= end) {
    return currentTime >= start && currentTime <= end;
  } else {
    return currentTime >= start || currentTime <= end;
  }
}

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const entry = userRateLimits.get(userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    userRateLimits.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= NOTIFICATION_RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

async function handlePushNotification(
  userId: number,
  type: string,
  title: string,
  body?: string,
  data?: Record<string, any>
): Promise<boolean> {
  const pushChannel = await db.query.notificationChannels.findFirst({
    where: and(
      eq(notificationChannels.userId, userId),
      eq(notificationChannels.channel, "push"),
      eq(notificationChannels.isActive, true)
    ),
  });

  if (!pushChannel) {
    console.log(`No push channel for user ${userId}`);
    return false;
  }

  try {
    const vapidPublicKey = process.env.WEBPUSH_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.WEBPUSH_VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("WebPush not configured, skipping push notification");
      return false;
    }

    const webpush = await import("webpush");
    
    const pushPayload = JSON.stringify({
      title,
      body,
      icon: "/icon.png",
      badge: "/badge.png",
      tag: type,
      data,
    });

    const result = await webpush.sendNotification(
      {
        endpoint: pushChannel.endpoint,
        keys: pushChannel.metadata as { p256dh: string; auth: string },
      },
      pushPayload,
      {
        vapidDetails: {
          subject: "mailto:notifications@example.com",
          publicKey: vapidPublicKey,
          privateKey: vapidPrivateKey,
        },
      }
    );

    console.log(`Push notification sent to user ${userId}: ${result.statusCode}`);
    return true;
  } catch (err) {
    const error = err as any;
    if (error.statusCode === 404 || error.statusCode === 410) {
      await db
        .update(notificationChannels)
        .set({ isActive: false })
        .where(eq(notificationChannels.id, pushChannel.id));
      console.log(`Push subscription expired for user ${userId}`);
      return false;
    }
    console.error(`Push notification failed for user ${userId}:`, err);
    throw err;
  }
}

async function handleEmailNotification(
  userId: number,
  type: string,
  title: string,
  body?: string,
  data?: Record<string, any>
): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.id, userId),
      eq(users.isActive, true),
      isNull(users.deletedAt)
    ),
  });

  if (!user?.email) {
    console.log(`No email for user ${userId}`);
    return false;
  }

  try {
    const emailHtml = buildNotificationEmailHtml(title, body || "", type, data);

    const { addEmailSendJob } = await import("./email-send.worker");
    
    await addEmailSendJob({
      mailboxId: 1,
      toEmails: [user.email],
      subject: title,
      bodyHtml: emailHtml,
      bodyText: body || "",
    });

    console.log(`Email notification queued for user ${userId}: ${user.email}`);
    return true;
  } catch (err) {
    console.error(`Email notification failed for user ${userId}:`, err);
    throw err;
  }
}

async function handleSmsNotification(
  userId: number,
  type: string,
  title: string,
  body?: string,
  data?: Record<string, any>
): Promise<boolean> {
  const smsChannel = await db.query.notificationChannels.findFirst({
    where: and(
      eq(notificationChannels.userId, userId),
      eq(notificationChannels.channel, "sms"),
      eq(notificationChannels.isActive, true)
    ),
  });

  if (!smsChannel) {
    console.log(`No SMS channel for user ${userId}`);
    return false;
  }

  console.log(`SMS notification for user ${userId} (future integration): ${title}`);
  return false;
}

function buildNotificationEmailHtml(
  title: string,
  body: string,
  type: string,
  data?: Record<string, any>
): string {
  const notificationUrl = data?.ticketId 
    ? `${process.env.APP_URL || "https://app.example.com"}/tickets/${data.ticketId}`
    : `${process.env.APP_URL || "https://app.example.com"}/notifications`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${title}</h2>
  </div>
  <div class="content">
    <p>${body}</p>
    <a href="${notificationUrl}" class="button">View Notification</a>
  </div>
  <div class="footer">
    <p>You received this email because you have notification alerts enabled.</p>
    <p><a href="${process.env.APP_URL || "https://app.example.com"}/settings/notifications">Manage notification preferences</a></p>
  </div>
</body>
</html>
  `.trim();
}

export async function processEmailDigestBatch(): Promise<void> {
  const usersWithDigest = await db.query.users.findMany({
    where: and(
      eq(users.isActive, true),
      isNull(users.deletedAt)
    ),
  });

  for (const user of usersWithDigest) {
    try {
      const prefs = await getUserPreferences(user.id);
      
      if (prefs.emailDigest === "never" || prefs.emailDigest === "immediate") {
        continue;
      }

      const sinceDate = new Date();
      if (prefs.emailDigest === "hourly") {
        sinceDate.setHours(sinceDate.getHours() - 1);
      } else if (prefs.emailDigest === "daily") {
        sinceDate.setDate(sinceDate.getDate() - 1);
      }

      const unreadNotifications = await db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, user.id),
          eq(notifications.isRead, false),
          sql`${notifications.createdAt} >= ${sinceDate}`
        ),
        orderBy: desc(notifications.createdAt),
        limit: 20,
      });

      if (unreadNotifications.length === 0) {
        continue;
      }

      await sendEmailDigest(user, unreadNotifications);
    } catch (err) {
      console.error(`Failed to process digest for user ${user.id}:`, err);
    }
  }
}

async function sendEmailDigest(
  user: typeof users.$inferSelect,
  notificationsToSend: typeof notifications.$inferSelect[]
): Promise<void> {
  if (!user.email) return;

  const digestHtml = buildDigestEmailHtml(notificationsToSend);

  try {
    const { addEmailSendJob } = await import("./email-send.worker");
    
    await addEmailSendJob({
      mailboxId: 1,
      toEmails: [user.email],
      subject: `You have ${notificationsToSend.length} new notifications`,
      bodyHtml: digestHtml,
      bodyText: `You have ${notificationsToSend.length} new notifications. Visit your dashboard to view them.`,
    });

    console.log(`Email digest sent to user ${user.id} with ${notificationsToSend.length} notifications`);
  } catch (err) {
    console.error(`Failed to send digest to user ${user.id}:`, err);
    throw err;
  }
}

function buildDigestEmailHtml(notificationsList: typeof notifications.$inferSelect[]): string {
  const itemsHtml = notificationsList
    .map((n) => `
      <div style="padding: 12px; background: white; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #4F46E5;">
        <strong>${n.title}</strong>
        ${n.body ? `<p style="margin: 8px 0 0 0; color: #666;">${n.body}</p>` : ""}
        <small style="color: #999;">${new Date(n.createdAt).toLocaleString()}</small>
      </div>
    `)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Notification Digest</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Your Notification Digest</h2>
    <p>${notificationsList.length} new notifications</p>
  </div>
  <div class="content">
    ${itemsHtml}
  </div>
  <div class="footer">
    <p><a href="${process.env.APP_URL || "https://app.example.com"}/notifications">View all notifications</a></p>
    <p><a href="${process.env.APP_URL || "https://app.example.com"}/settings/notifications">Manage notification preferences</a></p>
  </div>
</body>
</html>
  `.trim();
}

export async function registerPushSubscription(
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  const existing = await db.query.notificationChannels.findFirst({
    where: and(
      eq(notificationChannels.userId, userId),
      eq(notificationChannels.channel, "push"),
      eq(notificationChannels.endpoint, subscription.endpoint)
    ),
  });

  if (existing) {
    await db
      .update(notificationChannels)
      .set({ isActive: true, metadata: subscription.keys })
      .where(eq(notificationChannels.id, existing.id));
  } else {
    await db
      .insert(notificationChannels)
      .values({
        userId,
        channel: "push",
        endpoint: subscription.endpoint,
        isActive: true,
        metadata: subscription.keys,
      })
      .returning();
  }
}

export async function unregisterPushSubscription(
  userId: number,
  endpoint: string
): Promise<void> {
  await db
    .update(notificationChannels)
    .set({ isActive: false })
    .where(
      and(
        eq(notificationChannels.userId, userId),
        eq(notificationChannels.channel, "push"),
        eq(notificationChannels.endpoint, endpoint)
      )
    );
}

export async function closeNotificationDeliveryQueue(): Promise<void> {
  await notificationDeliveryQueue.close();
}

export { Worker, Job, Queue };
