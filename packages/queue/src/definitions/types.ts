export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface WorkflowJobData {
  workflowId: string;
  triggerType: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
}

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface DunningJobData {
  subscriptionId: number;
  invoiceId: number;
  attemptNumber: number;
  action: "retry_charge" | "send_email" | "send_in_app" | "downgrade";
}

export interface UsageCheckJobData {
  organizationId?: number;
}

export interface CsatExpirationJobData {
  surveyId?: number;
}

export interface SpamCheckJobData {
  ticketId: number;
}

export interface AutoAssignJobData {
  ticketId: number;
  teamId?: number;
}

export interface SlaCheckJobData {
  type: "check-sla" | "check-breach";
  ticketId?: number;
  slaId?: number;
}

export interface ExcelExportJobData {
  jobId: string;
  organizationId: number;
  userId: number;
  entityType: "tickets" | "contacts" | "users" | "kb_articles" | "saved_replies";
  filters?: Record<string, unknown>;
}

export interface ExcelImportJobData {
  jobId: string;
  organizationId: number;
  userId: number;
  entityType: "tickets" | "contacts" | "users" | "kb_articles" | "saved_replies";
  fileUrl: string;
  mode: "create" | "upsert";
  matchField?: string;
}

export interface EmailSendJobData {
  mailboxId: number;
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  inReplyTo?: string;
  ticketId?: number;
  templateId?: number;
  mergeTags?: Record<string, string>;
}

export interface EmailFetchJobData {
  mailboxId: number;
  userId?: number;
}

export interface LicenseVerificationJobData {
  organizationId: number;
  licenseKey: string;
  timestamp: number;
}

export interface ChatbotEscalationJobData {
  ticketId: number;
  sessionId: string;
  reason: string;
}

export interface GdprSlackCheckJobData {
  organizationId: number;
  action: "export" | "delete";
  requestId: string;
}

export interface SocialSyncJobData {
  organizationId: number;
  accountId: number;
  platform: "facebook" | "twitter" | "instagram" | "whatsapp";
  action: "sync" | "disconnect";
}

export interface EcommerceSyncJobData {
  organizationId: number;
  platform: "shopify" | "woocommerce" | "salla" | "zid";
  action: "sync" | "disconnect";
  webhookId?: string;
}

export interface AmazonSyncJobData {
  organizationId: number;
  accountId: number;
  action: "sync_orders" | "sync_products" | "disconnect";
}

export interface DisqusSyncJobData {
  organizationId: number;
  accountId: number;
  action: "sync" | "disconnect";
}

export interface PushNotificationJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: "high" | "normal";
}

export interface TicketJobData {
  ticketId: string;
  action: "create" | "update" | "close" | "reopen";
  metadata?: Record<string, unknown>;
}
