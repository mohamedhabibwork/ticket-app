import { NOTIFICATION_TYPES, NotificationType } from "./notifications";

export interface NotificationEmailData {
  ticket?: {
    id: number;
    reference: string;
    subject: string;
    status?: string;
    priority?: string;
    url?: string;
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
    ticketUrl?: string;
  };
  organization?: {
    name: string;
    logoUrl?: string;
    primaryColor?: string;
  };
  [key: string]: unknown;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function interpolate(text: string, data: NotificationEmailData): string {
  return text.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, obj, prop) => {
    const objData = data[obj] as Record<string, unknown> | undefined;
    if (objData && typeof objData === "object" && prop in objData) {
      return String(objData[prop]);
    }
    return match;
  });
}

function getBaseTemplate(data: NotificationEmailData) {
  const orgName = data.organization?.name || "Support";
  const logoUrl = data.organization?.logoUrl;
  const primaryColor = data.organization?.primaryColor || "#4F46E5";
  const ticketUrl = data.ticket?.url || "#";

  return {
    headerHtml: `
      <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
        ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 40px; margin-bottom: 8px;">` : ""}
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">${orgName}</h1>
      </div>
    `,
    footerHtml: `
      <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
        <p style="margin: 0 0 8px;">You received this email because you have notifications enabled.</p>
        <p style="margin: 0;">
          <a href="${ticketUrl}" style="color: ${primaryColor};">View in Dashboard</a> |
          <a href="{{unsubscribeUrl}}" style="color: ${primaryColor};">Unsubscribe</a>
        </p>
      </div>
    `,
    wrapperHtml: (content: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${orgName} Notification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; min-height: 100vh;">
          ${content}
        </div>
      </body>
      </html>
    `,
  };
}

const TEMPLATES: Record<NotificationType, (data: NotificationEmailData) => EmailTemplate> = {
  [NOTIFICATION_TYPES.TICKET_ASSIGNED]: (data) => {
    const { headerHtml, footerHtml, wrapperHtml } = getBaseTemplate(data);
    const agentName = data.agent?.name || "Agent";
    const ticketRef = data.ticket?.reference || "";
    const ticketSubject = data.ticket?.subject || "";
    const ticketUrl = data.ticket?.url || "#";

    return {
      subject: `You have been assigned to ticket #${ticketRef}`,
      html: wrapperHtml(`
        ${headerHtml}
        <div style="padding: 24px;">
          <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #166534; font-weight: 600;">Ticket Assigned to You</p>
          </div>
          <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">Ticket #${ticketRef}</h2>
          <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">${ticketSubject}</p>
          <p style="margin: 0 0 24px; color: #374151;">You have been assigned as the agent for this ticket by ${agentName}.</p>
          <a href="${ticketUrl}" style="display: inline-block; background-color: ${data.organization?.primaryColor || "#4F46E5"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Ticket</a>
        </div>
        ${footerHtml}
      `),
      text: `Ticket Assigned

Ticket #${ticketRef}: ${ticketSubject}
You have been assigned as the agent for this ticket by ${agentName}.

View ticket: ${ticketUrl}`,
    };
  },

  [NOTIFICATION_TYPES.TICKET_UPDATED]: (data) => {
    const { headerHtml, footerHtml, wrapperHtml } = getBaseTemplate(data);
    const ticketRef = data.ticket?.reference || "";
    const ticketSubject = data.ticket?.subject || "";
    const ticketStatus = data.ticket?.status || "";
    const ticketUrl = data.ticket?.url || "#";

    return {
      subject: `Ticket #${ticketRef} has been updated`,
      html: wrapperHtml(`
        ${headerHtml}
        <div style="padding: 24px;">
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #1e40af; font-weight: 600;">Ticket Updated</p>
          </div>
          <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">Ticket #${ticketRef}</h2>
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">${ticketSubject}</p>
          <p style="margin: 0 0 24px; color: #374151;">Status: ${ticketStatus}</p>
          <a href="${ticketUrl}" style="display: inline-block; background-color: ${data.organization?.primaryColor || "#4F46E5"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Ticket</a>
        </div>
        ${footerHtml}
      `),
      text: `Ticket Updated

Ticket #${ticketRef}: ${ticketSubject}
Status: ${ticketStatus}

View ticket: ${ticketUrl}`,
    };
  },

  [NOTIFICATION_TYPES.MENTION]: (data) => {
    const { headerHtml, footerHtml, wrapperHtml } = getBaseTemplate(data);
    const ticketRef = data.mention?.ticketReference || data.ticket?.reference || "";
    const mentionedBy = data.mention?.mentionedBy || "Someone";
    const contentPreview = data.mention?.contentPreview || "";
    const ticketUrl = data.mention?.ticketUrl || data.ticket?.url || "#";

    return {
      subject: `You were mentioned in ticket #${ticketRef}`,
      html: wrapperHtml(`
        ${headerHtml}
        <div style="padding: 24px;">
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-weight: 600;">You were mentioned</p>
          </div>
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827;">${mentionedBy} mentioned you</h2>
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #374151; font-style: italic;">"${contentPreview}"</p>
          </div>
          <p style="margin: 0 0 8px; color: #6b7280;">In ticket #${ticketRef}</p>
          <a href="${ticketUrl}" style="display: inline-block; background-color: ${data.organization?.primaryColor || "#4F46E5"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Ticket</a>
        </div>
        ${footerHtml}
      `),
      text: `You were mentioned

${mentionedBy} mentioned you in ticket #${ticketRef}:
"${contentPreview}"

View ticket: ${ticketUrl}`,
    };
  },

  [NOTIFICATION_TYPES.SYSTEM_ALERT]: (data) => {
    const { headerHtml, footerHtml, wrapperHtml } = getBaseTemplate(data);
    const message = data.system?.message || "";
    const severity = data.system?.severity || "info";
    const severityColors: Record<string, { bg: string; border: string; text: string }> = {
      info: { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" },
      warning: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
      critical: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
    };
    const colors = severityColors[severity] || severityColors.info;

    return {
      subject: `System Alert: ${message.substring(0, 50)}${message.length > 50 ? "..." : ""}`,
      html: wrapperHtml(`
        ${headerHtml}
        <div style="padding: 24px;">
          <div style="background-color: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: ${colors.text}; font-weight: 600;">System Alert</p>
          </div>
          <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">${message}</p>
        </div>
        ${footerHtml}
      `),
      text: `System Alert

${message}`,
    };
  },

  [NOTIFICATION_TYPES.SLA_BREACH]: (data) => {
    const { headerHtml, footerHtml, wrapperHtml } = getBaseTemplate(data);
    const ticketRef = data.sla?.ticketReference || data.ticket?.reference || "";
    const policyName = data.sla?.policyName || "";
    const breachType = data.sla?.breachType || "";
    const ticketUrl = data.ticket?.url || "#";

    return {
      subject: `SLA Breach Alert: Ticket #${ticketRef}`,
      html: wrapperHtml(`
        ${headerHtml}
        <div style="padding: 24px;">
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #991b1b; font-weight: 600;">⚠️ SLA Breach</p>
          </div>
          <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">Ticket #${ticketRef}</h2>
          <p style="margin: 0 0 8px; color: #6b7280;">Policy: ${policyName}</p>
          <p style="margin: 0 0 24px; color: #374151;">Breach Type: ${breachType}</p>
          <a href="${ticketUrl}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Ticket</a>
        </div>
        ${footerHtml}
      `),
      text: `SLA Breach Alert

Ticket #${ticketRef} has breached the ${policyName} SLA for ${breachType} time.

View ticket: ${ticketUrl}`,
    };
  },

  [NOTIFICATION_TYPES.CHAT_REQUEST]: (data) => {
    const { headerHtml, footerHtml, wrapperHtml } = getBaseTemplate(data);
    const customerName = data.chat?.customerName || "A customer";
    const sessionId = data.chat?.sessionId || "";

    return {
      subject: `New Chat Request from ${customerName}`,
      html: wrapperHtml(`
        ${headerHtml}
        <div style="padding: 24px;">
          <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #166534; font-weight: 600;">New Chat Request</p>
          </div>
          <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">${customerName} is waiting for assistance</h2>
          <p style="margin: 0 0 24px; color: #6b7280;">Session ID: ${sessionId}</p>
          <a href="#" style="display: inline-block; background-color: ${data.organization?.primaryColor || "#4F46E5"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Accept Chat</a>
        </div>
        ${footerHtml}
      `),
      text: `New Chat Request

${customerName} is waiting for assistance.
Session ID: ${sessionId}`,
    };
  },

  [NOTIFICATION_TYPES.SUBSCRIPTION_ALERT]: (data) => {
    const { headerHtml, footerHtml, wrapperHtml } = getBaseTemplate(data);
    const planName = data.subscription?.planName || "";
    const action = data.subscription?.action || "";
    const amount = data.subscription?.amount;

    return {
      subject: `Subscription Update: ${action}`,
      html: wrapperHtml(`
        ${headerHtml}
        <div style="padding: 24px;">
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #1e40af; font-weight: 600;">Subscription Update</p>
          </div>
          <h2 style="margin: 0 0 8px; font-size: 18px; color: #111827;">${action}</h2>
          <p style="margin: 0 0 8px; color: #6b7280;">Plan: ${planName}</p>
          ${amount ? `<p style="margin: 0 0 24px; color: #374151;">Amount: $${(amount / 100).toFixed(2)}</p>` : "<br>"}
        </div>
        ${footerHtml}
      `),
      text: `Subscription Update

Your subscription ${action}: ${planName}${amount ? `\nAmount: $${(amount / 100).toFixed(2)}` : ""}`,
    };
  },
};

export function renderNotificationEmail(
  type: NotificationType,
  data: NotificationEmailData,
): EmailTemplate | null {
  const templateFn = TEMPLATES[type];

  if (!templateFn) {
    return null;
  }

  const template = templateFn(data);

  return {
    subject: interpolate(template.subject, data),
    html: interpolate(template.html, data),
    text: interpolate(template.text, data),
  };
}

export function buildNotificationEmailPayload(
  type: NotificationType,
  data: NotificationEmailData,
): { subject: string; bodyHtml: string; bodyText: string } | null {
  const template = renderNotificationEmail(type, data);

  if (!template) {
    return null;
  }

  return {
    subject: template.subject,
    bodyHtml: template.html,
    bodyText: template.text,
  };
}
