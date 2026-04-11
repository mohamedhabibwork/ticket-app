import { eq } from "drizzle-orm";
import { db } from "@ticket-app/db";
import { users } from "@ticket-app/db/schema";
import { getSlackWebhookUrl } from "./notifications";
import { formatForSlack } from "./notificationTemplates";
import type { TemplateData } from "./notificationTemplates";
import type { NotificationType } from "./notifications";

interface SlackMessage {
  text: string;
  blocks?: unknown[];
  attachments?: Array<{
    color?: string;
    text?: string;
    footer?: string;
    ts?: number;
  }>;
}

export async function sendSlackNotification(
  userId: number,
  type: NotificationType,
  data: TemplateData,
): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return false;
  }

  const webhookUrl = await getSlackWebhookUrl(user.organizationId);

  if (!webhookUrl) {
    return false;
  }

  const formatted = formatForSlack(type, data);

  if (!formatted) {
    return false;
  }

  const message: SlackMessage = {
    text: formatted.text,
    blocks: formatted.blocks,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    return false;
  }
}

export async function sendSlackChannelNotification(
  organizationId: number,
  message: SlackMessage,
): Promise<boolean> {
  const webhookUrl = await getSlackWebhookUrl(organizationId);

  if (!webhookUrl) {
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to send Slack channel notification:", error);
    return false;
  }
}

export async function sendTicketAssignedSlack(
  organizationId: number,
  ticketRef: string,
  ticketSubject: string,
  agentName: string,
): Promise<boolean> {
  return sendSlackChannelNotification(organizationId, {
    text: `Ticket ${ticketRef} assigned to ${agentName}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Ticket #${ticketRef}* assigned to ${agentName}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: ticketSubject,
          },
        ],
      },
    ],
  });
}

export async function sendSlaBreachSlack(
  organizationId: number,
  ticketRef: string,
  policyName: string,
  breachType: string,
): Promise<boolean> {
  return sendSlackChannelNotification(organizationId, {
    text: `SLA Breach Alert: Ticket #${ticketRef}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `⚠️ *SLA Breach* on Ticket #${ticketRef}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Policy: ${policyName} | Breach Type: ${breachType}`,
          },
        ],
      },
    ],
  });
}

export async function sendSystemAlertSlack(
  organizationId: number,
  message: string,
  severity: "info" | "warning" | "critical" = "warning",
): Promise<boolean> {
  const colorMap = {
    info: "#439FE0",
    warning: "#F7D154",
    critical: "#E01E5A",
  };

  return sendSlackChannelNotification(organizationId, {
    text: `System Alert: ${message}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🏠 *System Alert*: ${message}`,
        },
      },
    ],
    attachments: [
      {
        color: colorMap[severity],
        footer: "Support Platform Alert",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });
}

export function buildSlackMessage(
  text: string,
  blocks?: unknown[],
  attachments?: Array<{ color?: string; text?: string; footer?: string }>,
): SlackMessage {
  return {
    text,
    blocks,
    attachments,
  };
}

export function parseSlackWebhookResponse(response: Response): {
  success: boolean;
  error?: string;
} {
  if (response.ok) {
    return { success: true };
  }

  return {
    success: false,
    error: `Slack API error: ${response.status} ${response.statusText}`,
  };
}
