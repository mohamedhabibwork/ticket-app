import { env } from "@ticket-app/env/server";
import { Queue, Worker, Job } from "bullmq";

export const QUEUE_NAMES = {
  EMAIL: "email",
  WORKFLOW: "workflow",
  NOTIFICATION: "notification",
  DUNNING: "billing-dunning",
  USAGE_CHECK: "billing-usage-check",
  CSAT_EXPIRATION: "csat-expiration",
  SPAM_CHECK: "spam-check",
  AUTO_ASSIGN: "ticket-auto-assign",
  SLA_ESCALATION: "sla-escalation",
} as const;

export type EmailJobData = {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
};

export type WorkflowJobData = {
  workflowId: string;
  triggerType: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
};

export type NotificationJobData = {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type DunningJobData = {
  subscriptionId: number;
  invoiceId: number;
  attemptNumber: number;
  action: "retry_charge" | "send_email" | "send_in_app" | "downgrade";
};

export type UsageCheckJobData = {
  organizationId?: number;
};

export type CsatExpirationJobData = {
  surveyId?: number;
};

export type SpamCheckJobData = {
  ticketId: number;
};

export type AutoAssignJobData = {
  ticketId: number;
  teamId?: number;
};

const connection = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const workflowQueue = new Queue<WorkflowJobData>(QUEUE_NAMES.WORKFLOW, {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export const notificationQueue = new Queue<NotificationJobData>(QUEUE_NAMES.NOTIFICATION, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const spamCheckQueue = new Queue<SpamCheckJobData>(QUEUE_NAMES.SPAM_CHECK, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export const autoAssignQueue = new Queue<AutoAssignJobData>(QUEUE_NAMES.AUTO_ASSIGN, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export const dunningQueue = new Queue<DunningJobData>(QUEUE_NAMES.DUNNING, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export const usageCheckQueue = new Queue<UsageCheckJobData>(QUEUE_NAMES.USAGE_CHECK, {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export const csatExpirationQueue = new Queue<CsatExpirationJobData>(QUEUE_NAMES.CSAT_EXPIRATION, {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export async function addEmailJob(data: EmailJobData): Promise<Job<EmailJobData>> {
  return emailQueue.add("send", data);
}

export async function addWorkflowJob(data: WorkflowJobData): Promise<Job<WorkflowJobData>> {
  return workflowQueue.add("execute", data, {
    jobId: `${data.workflowId}-${data.entityType}-${data.entityId}-${Date.now()}`,
  });
}

export async function addNotificationJob(
  data: NotificationJobData,
): Promise<Job<NotificationJobData>> {
  return notificationQueue.add("send", data, {
    priority: data.type === "urgent" ? 1 : 2,
  });
}

export async function addSpamCheckJob(data: SpamCheckJobData): Promise<Job<SpamCheckJobData>> {
  return spamCheckQueue.add("check", data, {
    jobId: `spam-check-${data.ticketId}-${Date.now()}`,
  });
}

export async function addAutoAssignJob(data: AutoAssignJobData): Promise<Job<AutoAssignJobData>> {
  return autoAssignQueue.add("auto_assign", data, {
    jobId: `auto-assign-${data.ticketId}-${Date.now()}`,
  });
}

export async function addDunningJob(data: DunningJobData): Promise<Job<DunningJobData>> {
  return dunningQueue.add("dunning", data, {
    jobId: `dunning-${data.subscriptionId}-${data.invoiceId}-${data.attemptNumber}`,
  });
}

export async function addUsageCheckJob(data: UsageCheckJobData): Promise<Job<UsageCheckJobData>> {
  return usageCheckQueue.add("usage_check", data, {
    jobId: `usage-check-${data.organizationId}-${Date.now()}`,
  });
}

export async function addCsatExpirationJob(
  data?: CsatExpirationJobData,
): Promise<Job<CsatExpirationJobData>> {
  return csatExpirationQueue.add("csat_expiration", data || {}, {
    jobId: `csat-expiration-${data?.surveyId || "all"}-${Date.now()}`,
  });
}

export { Queue, Worker, Job };
