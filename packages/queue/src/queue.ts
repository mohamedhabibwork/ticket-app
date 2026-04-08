import { Queue, Worker, type Job } from "bullmq";
import { getRedis } from "./redis";
import { env } from "@ticket-app/env/server";

export const emailQueueName = `${env.QUEUE_PREFIX}:email`;

export const emailQueue = new Queue(
  emailQueueName,
  { connection: getRedis() },
);

export type EmailJobData = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function addEmailJob(data: EmailJobData): Promise<Job> {
  return emailQueue.add("send-email", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  });
}

export function createEmailWorker(
  processor: (job: Job<EmailJobData>) => Promise<void>,
): Worker {
  return new Worker(emailQueueName, processor, { connection: getRedis() });
}

export const ticketQueueName = `${env.QUEUE_PREFIX}:ticket`;

export const ticketQueue = new Queue(
  ticketQueueName,
  { connection: getRedis() },
);

export type TicketJobData = {
  ticketId: string;
  action: "create" | "update" | "close" | "reopen";
  metadata?: Record<string, unknown>;
};

export async function addTicketJob(data: TicketJobData): Promise<Job> {
  return ticketQueue.add("ticket-event", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  });
}

export function createTicketWorker(
  processor: (job: Job<TicketJobData>) => Promise<void>,
): Worker {
  return new Worker(ticketQueueName, processor, { connection: getRedis() });
}

export async function closeQueues(): Promise<void> {
  await emailQueue.close();
  await ticketQueue.close();
}