import Bull from "bull";
import type {
  QueueDriver,
  QueueJob,
  JobOptions,
  WorkerOptions,
  Processor,
  JobType,
  QueueInterface,
  WorkerInterface,
} from "../driver";
import { env } from "@ticket-app/env/server";

function toQueueJob<T>(job: Bull.Job<T>): QueueJob<T> {
  return {
    id: String(job.id),
    name: job.name,
    data: job.data,
    progress: job.progress() as number,
    attemptsMade: job.attemptsMade,
    createdAt: new Date(job.timestamp),
    processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
    finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
    failedReason: job.failedReason || undefined,
    updateProgress: async (progress: number) => job.progress(progress),
    log: (message: string) => job.log(message),
    failed: async (error?: Error) => {
      if (error) {
        throw error;
      }
    },
  };
}

class BullQueue implements QueueInterface {
  private queue: Bull.Queue;

  constructor(name: string) {
    const fullName = `${env.QUEUE_PREFIX}-${name}`;
    const redisUrl = env.REDIS_URL;

    this.queue = new Bull(fullName, redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    });
  }

  get name(): string {
    return this.queue.name;
  }

  async add(jobName: string, data: unknown, options?: JobOptions): Promise<QueueJob> {
    const job = await this.queue.add(jobName, data, {
      attempts: options?.attempts,
      backoff: options?.backoff,
      removeOnComplete: options?.removeOnComplete,
      removeOnFail: options?.removeOnFail,
      priority: options?.priority,
      delay: options?.delay,
      jobId: options?.jobId,
    });
    return toQueueJob(job);
  }

  async getJob(jobId: string): Promise<QueueJob | undefined> {
    const job = await this.queue.getJob(jobId);
    return job ? toQueueJob(job) : undefined;
  }

  async getJobs(types?: JobType[], limit = 100): Promise<QueueJob[]> {
    const states = types || ["waiting", "active", "completed", "failed", "delayed"];
    const jobs: QueueJob[] = [];

    for (const state of states) {
      const stateJobs = await this.queue.getJobs(state as Bull.JobStatus, 0, limit);
      jobs.push(...stateJobs.map(toQueueJob));
    }

    return jobs.slice(0, limit);
  }

  async pause(): Promise<void> {
    await this.queue.pause();
  }

  async resume(): Promise<void> {
    await this.queue.resume();
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

class BullWorker implements WorkerInterface {
  private worker: Bull.Worker;
  queueName: string;

  constructor(queueName: string, processor: Processor, options?: WorkerOptions) {
    const fullName = `${env.QUEUE_PREFIX}-${queueName}`;
    const redisUrl = env.REDIS_URL;
    this.queueName = fullName;

    this.worker = new Bull.Worker(
      fullName,
      async (job: Bull.Job) => {
        await processor(toQueueJob(job.data));
      },
      {
        connection: redisUrl,
        concurrency: options?.concurrency,
        limiter: options?.limiter,
      },
    );
  }

  run(): void {
    // Worker starts automatically when created
  }

  async close(): Promise<void> {
    await this.worker.close();
  }

  async pause(): Promise<void> {
    await this.worker.pause();
  }

  async resume(): Promise<void> {
    await this.worker.resume();
  }
}

export class BullDriver implements QueueDriver {
  private queues: Map<string, BullQueue> = new Map();
  private workers: Map<string, BullWorker> = new Map();

  async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions,
  ): Promise<QueueJob<T>> {
    const queue = this.getQueue(queueName) as BullQueue;
    const job = await queue.add(jobName, data, options);
    return job as QueueJob<T>;
  }

  getQueue(name: string): QueueInterface {
    if (!this.queues.has(name)) {
      this.queues.set(name, new BullQueue(name));
    }
    return this.queues.get(name)!;
  }

  createWorker<T>(
    queueName: string,
    processor: Processor<T>,
    options?: WorkerOptions,
  ): WorkerInterface {
    if (!this.workers.has(queueName)) {
      this.workers.set(queueName, new BullWorker(queueName, processor as Processor, options));
    }
    return this.workers.get(queueName)!;
  }

  async getJob(queueName: string, jobId: string): Promise<QueueJob | undefined> {
    const queue = this.getQueue(queueName) as BullQueue;
    return queue.getJob(jobId);
  }

  async getJobs(queueName: string, types?: JobType[], limit?: number): Promise<QueueJob[]> {
    const queue = this.getQueue(queueName) as BullQueue;
    return queue.getJobs(types, limit);
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName) as BullQueue;
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName) as BullQueue;
    await queue.resume();
  }

  async closeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.close();
      this.queues.delete(queueName);
    }
    const worker = this.workers.get(queueName);
    if (worker) {
      await worker.close();
      this.workers.delete(queueName);
    }
  }

  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const queue of this.queues.values()) {
      closePromises.push(queue.close());
    }
    for (const worker of this.workers.values()) {
      closePromises.push(worker.close());
    }

    await Promise.all(closePromises);
    this.queues.clear();
    this.workers.clear();
  }
}
