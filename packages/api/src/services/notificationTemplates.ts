import { NOTIFICATION_TYPES, NotificationType } from "./notifications";

export interface TemplateData {
  ticket?: {
    id: number;
    reference: string;
    subject: string;
    status?: string;
    priority?: string;
  };
  agent?: {
    id: number;
    name: string;
    email: string;
  };
  customer?: {
    id: number;
    name: string;
    email: string;
  };
  team?: {
    id: number;
    name: string;
  };
  sla?: {
    policyName: string;
    breachType: "first_response" | "resolution";
    ticketReference: string;
  };
  chat?: {
    sessionId: number;
    customerName: string;
  };
  subscription?: {
    planName: string;
    action: string;
    amount?: number;
  };
  system?: {
    message: string;
    severity?: "info" | "warning" | "critical";
  };
  mention?: {
    ticketReference: string;
    mentionedBy: string;
    contentPreview: string;
  };
  [key: string]: unknown;
}

interface NotificationTemplate {
  title: string;
  body: string;
}

const TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  [NOTIFICATION_TYPES.TICKET_ASSIGNED]: {
    title: "Ticket Assigned",
    body: "Ticket #{{ticket.reference}} has been assigned to {{agent.name}}",
  },
  [NOTIFICATION_TYPES.TICKET_UPDATED]: {
    title: "Ticket Updated",
    body: "Ticket #{{ticket.reference}} has been updated. Status: {{ticket.status}}",
  },
  [NOTIFICATION_TYPES.MENTION]: {
    title: "You were mentioned",
    body: "{{mentionedBy}} mentioned you in ticket #{{ticket.reference}}: {{contentPreview}}",
  },
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: {
    title: "System Alert",
    body: "{{system.message}}",
  },
  [NOTIFICATION_TYPES.SLA_BREACH]: {
    title: "SLA Breach Alert",
    body: "Ticket #{{sla.ticketReference}} has breached the {{sla.policyName}} SLA for {{sla.breachType}} time",
  },
  [NOTIFICATION_TYPES.CHAT_REQUEST]: {
    title: "New Chat Request",
    body: "{{chat.customerName}} is waiting for assistance",
  },
  [NOTIFICATION_TYPES.SUBSCRIPTION_ALERT]: {
    title: "Subscription Update",
    body: "Your subscription {{subscription.action}}: {{subscription.planName}}",
  },
};

export function interpolateTemplate(template: string, data: TemplateData): string {
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, obj, prop) => {
    const objData = data[obj] as Record<string, unknown> | undefined;
    if (objData && typeof objData === "object" && prop in objData) {
      return String(objData[prop]);
    }
    return match;
  });
}

export function renderTemplate(
  type: NotificationType,
  data: TemplateData,
): { title: string; body: string } {
  const template = TEMPLATES[type];

  if (!template) {
    return {
      title: "Notification",
      body: "You have a new notification",
    };
  }

  return {
    title: interpolateTemplate(template.title, data),
    body: interpolateTemplate(template.body, data),
  };
}

export function getTemplateForType(type: NotificationType): NotificationTemplate | null {
  return TEMPLATES[type] || null;
}

export function buildNotificationPayload(
  type: NotificationType,
  data: TemplateData,
): { title: string; body: string; data: TemplateData } {
  const { title, body } = renderTemplate(type, data);

  return {
    title,
    body,
    data,
  };
}

export const EMAIL_DIGEST_TEMPLATE = {
  subject: "Your {{date}} notifications summary",
  header: "Your Notifications",
  body: `
{{#each notifications}}
- {{title}}: {{body}}
{{/each}}
  `.trim(),
  footer:
    "You received this email because you have email notifications enabled. Manage your preferences in settings.",
};

export function renderEmailDigest(
  notifications: Array<{ title: string; body: string; createdAt: Date }>,
  date: string,
): { subject: string; body: string } {
  const items = notifications.map((n) => `- ${n.title}: ${n.body}`).join("\n");

  return {
    subject: interpolateTemplate(EMAIL_DIGEST_TEMPLATE.subject, { date } as TemplateData),
    body: `${EMAIL_DIGEST_TEMPLATE.header}\n\n${items}\n\n${EMAIL_DIGEST_TEMPLATE.footer}`,
  };
}

export const SLACK_TEMPLATE = {
  ticket_assigned: {
    text: "Ticket Assigned",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Ticket #{{ticket.reference}}* assigned to {{agent.name}}",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "{{ticket.subject}}",
          },
        ],
      },
    ],
  },
  ticket_updated: {
    text: "Ticket Updated",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Ticket #{{ticket.reference}}* updated",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Status: {{ticket.status}}",
          },
        ],
      },
    ],
  },
  sla_breach: {
    text: "SLA Breach Alert",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "⚠️ *SLA Breach* on Ticket #{{sla.ticketReference}}",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Policy: {{sla.policyName}} | Breach Type: {{sla.breachType}}",
          },
        ],
      },
    ],
  },
  system_alert: {
    text: "System Alert",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🏠 *System Alert*: {{system.message}}",
        },
      },
    ],
  },
};

export function formatForSlack(
  type: NotificationType,
  data: TemplateData,
): { text: string; blocks: unknown[] } | null {
  const template = SLACK_TEMPLATE[type as keyof typeof SLACK_TEMPLATE];

  if (!template) {
    return null;
  }

  const text = interpolateTemplate(template.text, data);

  const blocks = template.blocks.map((block) => {
    if (block.type === "section" && "text" in block) {
      return {
        ...block,
        text: {
          ...block.text,
          text: interpolateTemplate(block.text?.text ?? "", data),
        },
      };
    }
    if (block.type === "context" && "elements" in block) {
      return {
        ...block,
        elements: (block.elements ?? []).map((el: { type: string; text: string }) => ({
          ...el,
          text: interpolateTemplate(el.text, data),
        })),
      };
    }
    return block;
  });

  return { text, blocks };
}
