import { Queue, Worker, Job } from "bullmq";
import { eq, and, lte, desc } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { getRedis } from "@ticket-app/queue";
import { notifications, users } from "@ticket-app/db/schema";
import type { NotificationJobData } from "@ticket-app/db/lib/queues";
import {
  getUserNotificationPreferences,
  markNotificationAsRead,
  NOTIFICATION_TYPES,
} from "../services/notifications";
import { TemplateData } from "../services/notificationTemplates";
import { sendSlackNotification } from "../services/slack";
import {
  sendNotificationEmailIfImportant,
  queueEmailDigest,
  NotificationEmailData,
} from "../services/notificationEmail";

export const NOTIFICATION_PROCESS_QUEUE = "notification-process";

export type NotificationProcessJobData = {
  type: "process_notification" | "send_email_digest" | "mark_read";
  notificationId?: number;
  userId?: number;
};

export const notificationProcessQueue = new Queue<NotificationProcessJobData>(
  NOTIFICATION_PROCESS_QUEUE,
  {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    },
  },
);

export async function addNotificationProcessJob(
  data: NotificationProcessJobData,
  options?: { delay?: number; jobId?: string },
): Promise<Job<NotificationProcessJobData>> {
  return notificationProcessQueue.add("process", data, {
    jobId: options?.jobId || `${data.type}-${Date.now()}`,
    delay: options?.delay,
  });
}

export function createNotificationProcessWorker() {
  return new Worker<NotificationProcessJobData>(
    NOTIFICATION_PROCESS_QUEUE,
    async (job) => {
      const { type } = job.data;

      switch (type) {
        case "process_notification":
          return handleProcessNotification(
            job.data as { type: "process_notification" } & NotificationJobData,
          );
        case "send_email_digest":
          return handleSendEmailDigest(job.data as { type: "send_email_digest"; userId: number });
        case "mark_read":
          return handleMarkRead(
            job.data as { type: "mark_read"; notificationId: number; userId: number },
          );
        default:
          throw new Error(`Unknown notification process type: ${type}`);
      }
    },
    {
      connection: getRedis(),
      concurrency: 10,
    },
  );
}

async function handleProcessNotification(
  data: NotificationJobData & { type: "process_notification" },
) {
  const { userId, type, title: _title, message: _message, metadata } = data;
  const userIdNum = parseInt(userId);

  const prefs = await getUserNotificationPreferences(userIdNum);

  if (!prefs?.inAppEnabled) {
    return;
  }

  const isEnabled = prefs.types[type as keyof typeof prefs.types] ?? true;
  if (!isEnabled) {
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userIdNum),
  });

  if (!user) {
    return;
  }

  if (prefs.channels.slack) {
    await sendSlackNotification(
      userIdNum,
      type as keyof typeof NOTIFICATION_TYPES,
      metadata as TemplateData,
    );
  }

  if (prefs.channels.email) {
    const emailData: NotificationEmailData = {
      ...(metadata as NotificationEmailData),
    };

    if (metadata?.ticket) {
      emailData.ticket = metadata.ticket as any;
    }
    if (metadata?.agent) {
      emailData.agent = metadata.agent as any;
    }
    if (metadata?.customer) {
      emailData.customer = metadata.customer as any;
    }
    if (metadata?.mention) {
      emailData.mention = metadata.mention as any;
    }
    if (metadata?.sla) {
      emailData.sla = metadata.sla as any;
    }
    if (metadata?.system) {
      emailData.system = metadata.system as any;
    }
    if (metadata?.subscription) {
      emailData.subscription = metadata.subscription as any;
    }
    if (metadata?.chat) {
      emailData.chat = metadata.chat as any;
    }

    const organizationId = (metadata?.organizationId as number) || user.organizationId;
    await sendNotificationEmailIfImportant(
      userIdNum,
      type as keyof typeof NOTIFICATION_TYPES,
      emailData,
      organizationId,
    );
  }
}

async function handleSendEmailDigest(data: { type: "send_email_digest"; userId: number }) {
  const { userId } = data;

  const prefs = await getUserNotificationPreferences(userId);
  if (!prefs?.emailDigest) {
    return;
  }

  const unreadNotifications = await db.query.notifications.findMany({
    where: and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false),
      lte(notifications.createdAt, new Date()),
    ),
    orderBy: [desc(notifications.createdAt)],
    limit: 50,
  });

  if (unreadNotifications.length === 0) {
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user?.email) {
    return;
  }

  const organizationId = user.organizationId;

  await queueEmailDigest(
    userId,
    organizationId,
    unreadNotifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body || undefined,
      data: n.data as Record<string, unknown> | undefined,
    })),
  );

  await markAllNotificationsAsReadForUser(userId);
}

async function handleMarkRead(data: { type: "mark_read"; notificationId: number; userId: number }) {
  await markNotificationAsRead(data.notificationId, data.userId);
}

export async function markAllNotificationsAsReadForUser(userId: number): Promise<void> {
  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function scheduleEmailDigest(
  userId: number,
  delayMs: number = 3600000,
): Promise<void> {
  await notificationProcessQueue.add(
    "process",
    { type: "send_email_digest", userId },
    {
      jobId: `email-digest-${userId}`,
      delay: delayMs,
    },
  );
}

export async function scheduleBreachDigest(
  userId: number,
  delayMs: number = 300000,
): Promise<void> {
  await notificationProcessQueue.add(
    "process",
    { type: "send_email_digest", userId },
    {
      jobId: `breach-digest-${userId}-${Date.now()}`,
      delay: delayMs,
    },
  );
}

export { Worker, Job };
