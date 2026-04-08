import { env } from "@ticket-app/env/server";
import { Queue, Worker, Job } from "bullmq";

export const QUEUE_NAMES = {
  EMAIL: "email",
  WORKFLOW: "workflow",
  NOTIFICATION: "notification",
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

const connection = {
  host: env.REDIS_URL.replace("redis://", "").split(":")[0] || "localhost",
  port: parseInt(env.REDIS_URL.split(":")[2] || "6379"),
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

export const notificationQueue = new Queue<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATION,
  {
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
  },
);

export async function addEmailJob(data: EmailJobData): Promise<Job<EmailJobData>> {
  return emailQueue.add("send", data);
}

export async function addWorkflowJob(
  data: WorkflowJobData,
): Promise<Job<WorkflowJobData>> {
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

export { Queue, Worker, Job };
