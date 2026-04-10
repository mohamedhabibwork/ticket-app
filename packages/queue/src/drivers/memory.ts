import type {
  QueueDriver,
  QueueJob,
  JobOptions,
  WorkerOptions,
  Processor,
  JobType,
  QueueInterface,
  WorkerInterface,
  RepeatJob,
} from "../driver";

interface StoredJob<T = unknown> {
  id: string;
  name: string;
  data: T;
  progress: number;
  attemptsMade: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  state: JobType;
  delay?: number;
  repeat?: {
    pattern?: string;
    every?: number;
    limit?: number;
    count: number;
  };
  timeoutId?: ReturnType<typeof setTimeout>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function toQueueJob<T>(job: StoredJob<T>): QueueJob<T> {
  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    createdAt: new Date(job.timestamp),
    processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
    finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
    failedReason: job.failedReason,
    updateProgress: async (progress: number) => {
      job.progress = progress;
    },
    log: (message: string) => {
      console.log(`[MemoryQueue:${job.id}] ${message}`);
    },
    failed: async (error?: Error) => {
      job.failedReason = error?.message || "Unknown error";
      job.state = "failed";
      job.finishedOn = Date.now();
    },
  };
}

class MemoryQueue implements QueueInterface {
  private jobs: Map<string, StoredJob> = new Map();
  private waiting: Set<string> = new Set();
  private active: Set<string> = new Set();
  private completed: Set<string> = new Set();
  private failed: Set<string> = new Set();
  private delayed: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private repeatJobs: Map<string, StoredJob> = new Map();
  private paused: boolean = false;
  readonly name: string;
  private processor?: Processor;
  private concurrency: number = 1;
  private processingCount: number = 0;

  constructor(name: string) {
    this.name = name;
  }

  setProcessor(processor: Processor, concurrency: number = 1): void {
    this.processor = processor;
    this.concurrency = concurrency;
  }

  async add<T>(jobName: string, data: T, options?: JobOptions): Promise<QueueJob<T>> {
    const jobId = options?.jobId || generateId();
    const now = Date.now();

    const job: StoredJob<T> = {
      id: jobId,
      name: jobName,
      data,
      progress: 0,
      attemptsMade: 0,
      timestamp: now,
      state: "waiting",
      delay: options?.delay,
      repeat: options?.repeat
        ? {
            pattern: options.repeat.pattern,
            every: options.repeat.every,
            limit: options.repeat.limit,
            count: 0,
          }
        : undefined,
    };

    this.jobs.set(jobId, job as StoredJob);

    if (job.delay && job.delay > 0) {
      this.delayed.set(
        jobId,
        setTimeout(() => this.moveToWaiting(jobId), job.delay!),
      );
      (job as StoredJob).state = "delayed";
    } else {
      this.waiting.add(jobId);
    }

    if (this.processor && !this.paused) {
      this.processNext();
    }

    return toQueueJob(job as StoredJob<T>);
  }

  private moveToWaiting(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.state === "delayed") {
      job.state = "waiting";
      this.waiting.add(jobId);
      this.delayed.delete(jobId);
    }
  }

  private async processNext(): Promise<void> {
    if (this.paused) return;
    if (this.processingCount >= this.concurrency) return;

    const availableSlots = this.concurrency - this.processingCount;
    let toProcess = Array.from(this.waiting).slice(0, availableSlots);

    for (const jobId of toProcess) {
      this.waiting.delete(jobId);
      this.active.add(jobId);
      this.processingCount++;
      this.processJob(jobId);
    }
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !this.processor) return;

    const queueJob = toQueueJob(job);

    try {
      job.processedOn = Date.now();
      await this.processor(queueJob);
      job.finishedOn = Date.now();
      job.state = "completed";
      this.active.delete(jobId);
      this.completed.add(jobId);
      this.processingCount--;

      if (job.repeat) {
        await this.scheduleRepeat(job);
      }
    } catch (error) {
      job.attemptsMade++;
      const maxAttempts = 3;

      if (job.attemptsMade >= maxAttempts) {
        job.failedReason = error instanceof Error ? error.message : "Unknown error";
        job.finishedOn = Date.now();
        job.state = "failed";
        this.active.delete(jobId);
        this.failed.add(jobId);

        if (job.repeat) {
          await this.scheduleRepeat(job);
        }
      } else {
        job.state = "waiting";
        this.active.delete(jobId);
        this.waiting.add(jobId);

        const delay = Math.min(1000 * Math.pow(2, job.attemptsMade - 1), 30000);
        setTimeout(() => this.processNext(), delay);
        return;
      }
    }

    this.processingCount--;
    this.processNext();
  }

  private async scheduleRepeat(job: StoredJob): Promise<void> {
    if (!job.repeat) return;

    const repeat = job.repeat;
    let intervalMs: number;

    if (repeat.every) {
      intervalMs = repeat.every;
    } else if (repeat.pattern) {
      intervalMs = this.parseCronPattern(repeat.pattern);
    } else {
      return;
    }

    if (repeat.limit && repeat.count >= repeat.limit) {
      return;
    }

    repeat.count++;

    setTimeout(async () => {
      const newJobData =
        typeof job.data === "object" && job.data !== null ? { ...(job.data as object) } : job.data;
      const newJob: StoredJob = {
        ...job,
        data: newJobData as typeof job.data,
        id: generateId(),
        timestamp: Date.now(),
        state: "waiting",
        attemptsMade: 0,
        progress: 0,
        processedOn: undefined,
        finishedOn: undefined,
        failedReason: undefined,
        repeat: { ...repeat },
      };

      this.jobs.set(newJob.id, newJob);
      this.waiting.add(newJob.id);

      if (this.processor && !this.paused) {
        this.processNext();
      }

      await this.scheduleRepeat(newJob);
    }, intervalMs);
  }

  private parseCronPattern(pattern: string): number {
    const parts = pattern.trim().split(/\s+/);
    if (parts.length < 5) return 60000;

    if (pattern.startsWith("*/")) {
      const interval = parseInt(pattern.slice(2));
      return interval * 1000;
    }

    return 60000;
  }

  async getJob(jobId: string): Promise<QueueJob | undefined> {
    const job = this.jobs.get(jobId);
    return job ? toQueueJob(job) : undefined;
  }

  async getJobs(types?: JobType[], limit = 100): Promise<QueueJob[]> {
    const states = types || ["waiting", "active", "completed", "failed", "delayed"];
    const jobs: QueueJob[] = [];

    for (const state of states) {
      let jobIds: Iterable<string>;
      switch (state) {
        case "waiting":
          jobIds = this.waiting;
          break;
        case "active":
          jobIds = this.active;
          break;
        case "completed":
          jobIds = this.completed;
          break;
        case "failed":
          jobIds = this.failed;
          break;
        case "delayed":
          jobIds = this.delayed.keys();
          break;
        default:
          continue;
      }

      for (const jobId of jobIds) {
        const job = this.jobs.get(jobId);
        if (job) {
          jobs.push(toQueueJob(job));
        }
      }
    }

    return jobs.slice(0, limit);
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async resume(): Promise<void> {
    this.paused = false;
    this.processNext();
  }

  async close(): Promise<void> {
    for (const timeoutId of this.delayed.values()) {
      clearTimeout(timeoutId);
    }
    this.delayed.clear();
    this.jobs.clear();
    this.waiting.clear();
    this.active.clear();
    this.completed.clear();
    this.failed.clear();
    this.repeatJobs.clear();
  }

  async getRepeatedJobs(): Promise<RepeatJob[]> {
    return Array.from(this.repeatJobs.values()).map((job) => ({
      id: job.id,
      name: job.name,
      nextDate: new Date(job.timestamp + (job.repeat?.every || 60000)),
      pattern: job.repeat?.pattern || "",
      limit: job.repeat?.limit,
      count: job.repeat?.count,
      remove: async () => {
        this.repeatJobs.delete(job.id);
      },
    }));
  }
}

class MemoryWorker implements WorkerInterface {
  queueName: string;
  private queue: MemoryQueue;

  constructor(queueName: string, processor: Processor, options?: WorkerOptions) {
    this.queueName = queueName;
    this.queue = new MemoryQueue(queueName);
    this.queue.setProcessor(processor as Processor, options?.concurrency || 1);
  }

  run(): void {
    // Worker starts processing automatically via queue's add method
  }

  async close(): Promise<void> {
    await this.queue.close();
  }

  async pause(): Promise<void> {
    await this.queue.pause();
  }

  async resume(): Promise<void> {
    await this.queue.resume();
  }
}

export class MemoryDriver implements QueueDriver {
  private queues: Map<string, MemoryQueue> = new Map();
  private workers: Map<string, MemoryWorker> = new Map();

  async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions,
  ): Promise<QueueJob<T>> {
    const queue = this.getQueue(queueName) as MemoryQueue;
    return queue.add(jobName, data, options) as Promise<QueueJob<T>>;
  }

  getQueue(name: string): QueueInterface {
    if (!this.queues.has(name)) {
      this.queues.set(name, new MemoryQueue(name));
    }
    return this.queues.get(name)!;
  }

  createWorker<T>(
    queueName: string,
    processor: Processor<T>,
    options?: WorkerOptions,
  ): WorkerInterface {
    if (!this.workers.has(queueName)) {
      this.workers.set(queueName, new MemoryWorker(queueName, processor as Processor, options));
    }
    return this.workers.get(queueName)!;
  }

  async getJob(queueName: string, jobId: string): Promise<QueueJob | undefined> {
    const queue = this.getQueue(queueName) as MemoryQueue;
    return queue.getJob(jobId);
  }

  async getJobs(queueName: string, types?: JobType[], limit?: number): Promise<QueueJob[]> {
    const queue = this.getQueue(queueName) as MemoryQueue;
    return queue.getJobs(types, limit);
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName) as MemoryQueue;
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName) as MemoryQueue;
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
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    this.queues.clear();
    this.workers.clear();
  }
}
