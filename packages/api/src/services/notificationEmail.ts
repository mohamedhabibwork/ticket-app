import { eq, and } from "drizzle-orm";
import { env } from "@ticket-app/env/server";
import { db } from "@ticket-app/db";
import { users, organizations } from "@ticket-app/db/schema";
import { mailboxes, emailMessages } from "@ticket-app/db/schema/_mailboxes";
import { addEmailSendJob } from "../jobs/emailSend";
import {
  getUserNotificationPreferences,
  NotificationType,
  NOTIFICATION_TYPES,
} from "./notifications";
import { buildNotificationEmailPayload, NotificationEmailData } from "./notificationEmailTemplates";
import crypto from "crypto";

const IMPORTANT_NOTIFICATION_TYPES = [
  NOTIFICATION_TYPES.TICKET_ASSIGNED,
  NOTIFICATION_TYPES.MENTION,
  NOTIFICATION_TYPES.SLA_BREACH,
  NOTIFICATION_TYPES.SUBSCRIPTION_ALERT,
] as const;

function generateUnsubscribeToken(userId: number, type: string): string {
  const secret = env.APP_SECRET || "default-secret-change-me";
  return crypto
    .createHmac("sha256", secret)
    .update(`${userId}-${type}`)
    .digest("hex")
    .substring(0, 32);
}

export async function getUnsubscribeUrl(
  userId: number,
  type: string,
  baseUrl: string = "https://app.ticket-app.com",
): Promise<string> {
  const token = generateUnsubscribeToken(userId, type);
  return `${baseUrl}/unsubscribe?userId=${userId}&type=${type}&token=${token}`;
}

export function verifyUnsubscribeToken(userId: number, type: string, token: string): boolean {
  const expectedToken = generateUnsubscribeToken(userId, type);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}

async function getOrganizationBranding(organizationId: number): Promise<{
  name: string;
  logoUrl?: string;
  primaryColor?: string;
} | null> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    with: { branding: true },
  });

  if (!org) return null;

  return {
    name: org.name,
    logoUrl: org.branding?.emailLogoUrl || org.branding?.logoUrl,
    primaryColor: org.branding?.emailHeaderColor || org.branding?.primaryColor,
  };
}

async function getDefaultMailbox(organizationId: number) {
  return db.query.mailboxes.findFirst({
    where: and(
      eq(mailboxes.organizationId, organizationId),
      eq(mailboxes.isDefault, true),
      eq(mailboxes.isActive, true),
    ),
    with: { smtpConfig: true },
  });
}

export async function sendNotificationEmail(
  userId: number,
  type: NotificationType,
  data: NotificationEmailData,
  organizationId: number,
): Promise<{ success: boolean; emailMessageId?: number; error?: string }> {
  const prefs = await getUserNotificationPreferences(userId);

  if (!prefs?.channels.email) {
    return { success: false, error: "User has email notifications disabled" };
  }

  const isEnabled = prefs.types[type] ?? true;
  if (!isEnabled) {
    return { success: false, error: "Notification type disabled for user" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user?.email) {
    return { success: false, error: "User has no email address" };
  }

  const organization = await getOrganizationBranding(organizationId);

  const emailData: NotificationEmailData = {
    ...data,
    organization,
  };

  if (data.ticket) {
    const ticketUrl = `https://app.ticket-app.com/tickets/${data.ticket.id}`;
    emailData.ticket = {
      ...data.ticket,
      url: ticketUrl,
    };
  }

  if (data.mention) {
    const mentionTicketUrl = `https://app.ticket-app.com/tickets/${data.mention.ticketReference}`;
    emailData.mention = {
      ...data.mention,
      ticketUrl: mentionTicketUrl,
    };
  }

  const payload = buildNotificationEmailPayload(type, emailData);

  if (!payload) {
    return { success: false, error: "No email template found for notification type" };
  }

  const unsubscribeUrl = await getUnsubscribeUrl(userId, type);
  payload.bodyHtml = payload.bodyHtml.replace("{{unsubscribeUrl}}", unsubscribeUrl);

  const defaultMailbox = await getDefaultMailbox(organizationId);

  if (!defaultMailbox) {
    return { success: false, error: "No default mailbox configured" };
  }

  const messageId = `notif-${userId}-${type}-${Date.now()}@ticket-app`;

  const [emailMessage] = await db
    .insert(emailMessages)
    .values({
      organizationId,
      mailboxId: defaultMailbox.id,
      direction: "outbound",
      messageId,
      fromEmail: defaultMailbox.email,
      fromName: defaultMailbox.name,
      toEmails: [user.email],
      subject: payload.subject,
      bodyHtml: payload.bodyHtml,
      bodyText: payload.bodyText,
      isSpam: false,
    })
    .returning();

  if (emailMessage) {
    await addEmailSendJob(emailMessage.id);
    return { success: true, emailMessageId: emailMessage.id };
  }

  return { success: false, error: "Failed to create email message" };
}

export async function sendNotificationEmailIfImportant(
  userId: number,
  type: NotificationType,
  data: NotificationEmailData,
  organizationId: number,
): Promise<void> {
  const isImportant = (IMPORTANT_NOTIFICATION_TYPES as readonly string[]).includes(type);

  if (isImportant) {
    await sendNotificationEmail(userId, type, data, organizationId);
  }
}

export async function queueEmailDigest(
  userId: number,
  organizationId: number,
  notificationsToInclude: Array<{
    id: number;
    type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }>,
): Promise<void> {
  if (notificationsToInclude.length === 0) {
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user?.email) {
    return;
  }

  const prefs = await getUserNotificationPreferences(userId);
  if (!prefs?.emailDigest) {
    return;
  }

  const organization = await getOrganizationBranding(organizationId);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const primaryColor = organization?.primaryColor || "#4F46E5";
  const orgName = organization?.name || "Support";

  const itemsHtml = notificationsToInclude
    .map(
      (n) => `
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <p style="margin: 0 0 4px; font-weight: 600; color: #111827;">${n.title}</p>
        <p style="margin: 0; color: #6b7280;">${n.body || ""}</p>
      </div>
    `,
    )
    .join("");

  const bodyHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${orgName} Notification Summary</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; min-height: 100vh;">
        <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
          ${organization?.logoUrl ? `<img src="${organization.logoUrl}" alt="${orgName}" style="max-height: 40px; margin-bottom: 8px;">` : ""}
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">Your Notifications - ${today}</h1>
        </div>
        <div style="padding: 24px;">
          ${itemsHtml}
        </div>
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0 0 8px;">You received this email because you have email notifications enabled.</p>
          <p style="margin: 0;">
            <a href="https://app.ticket-app.com/settings/notifications" style="color: ${primaryColor};">Manage Preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const itemsText = notificationsToInclude.map((n) => `- ${n.title}: ${n.body || ""}`).join("\n");

  const bodyText = `Your Notifications - ${today}

${itemsText}

Manage your preferences: https://app.ticket-app.com/settings/notifications`;

  const defaultMailbox = await getDefaultMailbox(organizationId);

  if (!defaultMailbox) {
    return;
  }

  const messageId = `digest-${userId}-${Date.now()}@ticket-app`;

  const [emailMessage] = await db
    .insert(emailMessages)
    .values({
      organizationId,
      mailboxId: defaultMailbox.id,
      direction: "outbound",
      messageId,
      fromEmail: defaultMailbox.email,
      fromName: defaultMailbox.name,
      toEmails: [user.email],
      subject: `Your ${today} notifications summary`,
      bodyHtml,
      bodyText,
      isSpam: false,
    })
    .returning();

  if (emailMessage) {
    await addEmailSendJob(emailMessage.id);
  }
}
