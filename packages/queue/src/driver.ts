export type QueueProvider = "bullmq" | "bull" | "memory";

export type JobType = "waiting" | "active" | "completed" | "failed" | "delayed";

export interface JobOptions {
  attempts?: number;
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
  removeOnComplete?: number | boolean;
  removeOnFail?: number | boolean;
  priority?: number;
  delay?: number;
  jobId?: string;
  repeat?: RepeatOptions;
}

export interface RepeatOptions {
  pattern?: string;
  every?: number;
  limit?: number;
  count?: number;
}

export interface WorkerOptions {
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
}

export interface Processor<T = unknown> {
  (job: QueueJob<T>): Promise<void>;
}

export interface QueueJob<T = unknown> {
  id: string;
  name: string;
  data: T;
  progress: number;
  attemptsMade: number;
  createdAt: Date;
  processedOn?: Date;
  finishedOn?: Date;
  failedReason?: string;
  updateProgress(progress: number): Promise<void>;
  log(message: string): void;
  failed(error?: Error): Promise<void>;
}

export interface QueueDriver {
  addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions,
  ): Promise<QueueJob<T>>;
  getQueue(name: string): QueueInterface;
  createWorker<T>(
    queueName: string,
    processor: Processor<T>,
    options?: WorkerOptions,
  ): WorkerInterface;
  getJob(queueName: string, jobId: string): Promise<QueueJob | undefined>;
  getJobs(queueName: string, types?: JobType[], limit?: number): Promise<QueueJob[]>;
  pauseQueue(queueName: string): Promise<void>;
  resumeQueue(queueName: string): Promise<void>;
  closeQueue(queueName: string): Promise<void>;
  closeAll(): Promise<void>;
}

export interface QueueInterface {
  name: string;
  add(jobName: string, data: unknown, options?: JobOptions): Promise<QueueJob>;
  getJob(jobId: string): Promise<QueueJob | undefined>;
  getJobs(types?: JobType[], limit?: number): Promise<QueueJob[]>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
}

export interface WorkerInterface {
  queueName: string;
  run(): void;
  close(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
}

export interface RepeatJob {
  id: string;
  name: string;
  nextDate: Date;
  pattern: string;
  limit?: number;
  count?: number;
  remove(): Promise<void>;
}

let driver: QueueDriver | null = null;

export function getQueueDriver(): QueueDriver {
  if (driver) {
    return driver;
  }

  const { env } = require("@ticket-app/env/server");
  const provider = env.QUEUE_PROVIDER || "bullmq";

  switch (provider) {
    case "bullmq": {
      const { BullMQDriver } = require("./drivers/bullmq");
      driver = new BullMQDriver();
      break;
    }
    case "bull": {
      const { BullDriver } = require("./drivers/bull");
      driver = new BullDriver();
      break;
    }
    case "memory": {
      const { MemoryDriver } = require("./drivers/memory");
      driver = new MemoryDriver();
      break;
    }
    default: {
      const { BullMQDriver } = require("./drivers/bullmq");
      driver = new BullMQDriver();
    }
  }

  return driver!;
}

export function resetQueueDriver(): void {
  driver = null;
}
