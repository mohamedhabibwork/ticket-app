import type { Job } from "bullmq";
import { getQueueDriver } from "./driver";
import { env } from "@ticket-app/env/server";

export const emailQueueName = `${env.QUEUE_PREFIX}-email`;
export const ticketQueueName = `${env.QUEUE_PREFIX}-ticket`;
export const excelExportQueueName = `${env.QUEUE_PREFIX}-excel-export`;
export const excelImportQueueName = `${env.QUEUE_PREFIX}-excel-import`;

export const emailQueue = getQueueDriver().getQueue("email") as any;
export const ticketQueue = getQueueDriver().getQueue("ticket") as any;
export const excelExportQueue = getQueueDriver().getQueue("excel-export") as any;
export const excelImportQueue = getQueueDriver().getQueue("excel-import") as any;

export type EmailJobData = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function addEmailJob(data: EmailJobData): Promise<Job> {
  const driver = getQueueDriver();
  return driver.addJob("email", "send-email", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  }) as any;
}

export function createEmailWorker(processor: (job: Job<EmailJobData>) => Promise<void>) {
  const driver = getQueueDriver();
  return driver.createWorker("email", processor as any) as any;
}

export type TicketJobData = {
  ticketId: string;
  action: "create" | "update" | "close" | "reopen";
  metadata?: Record<string, unknown>;
};

export async function addTicketJob(data: TicketJobData): Promise<Job> {
  const driver = getQueueDriver();
  return driver.addJob("ticket", "ticket-event", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  }) as any;
}

export function createTicketWorker(processor: (job: Job<TicketJobData>) => Promise<void>) {
  const driver = getQueueDriver();
  return driver.createWorker("ticket", processor as any) as any;
}

export async function closeQueues(): Promise<void> {
  const driver = getQueueDriver();
  await driver.closeAll();
}

export type ExcelExportJobData = {
  jobId: string;
  organizationId: number;
  userId: number;
  entityType: "tickets" | "contacts" | "users" | "kb_articles" | "saved_replies";
  filters?: Record<string, unknown>;
};

export async function addExcelExportJob(data: ExcelExportJobData): Promise<Job> {
  const driver = getQueueDriver();
  return driver.addJob("excel-export", "excel-export", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 50,
    removeOnFail: 100,
  }) as any;
}

export function createExcelExportWorker(
  processor: (job: Job<ExcelExportJobData>) => Promise<void>,
) {
  const driver = getQueueDriver();
  return driver.createWorker("excel-export", processor as any) as any;
}

export type ExcelImportJobData = {
  jobId: string;
  organizationId: number;
  userId: number;
  entityType: "tickets" | "contacts" | "users" | "kb_articles" | "saved_replies";
  fileUrl: string;
  mode: "create" | "upsert";
  matchField?: string;
};

export async function addExcelImportJob(data: ExcelImportJobData): Promise<Job> {
  const driver = getQueueDriver();
  return driver.addJob("excel-import", "excel-import", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 50,
    removeOnFail: 100,
  }) as any;
}

export function createExcelImportWorker(
  processor: (job: Job<ExcelImportJobData>) => Promise<void>,
) {
  const driver = getQueueDriver();
  return driver.createWorker("excel-import", processor as any) as any;
}
