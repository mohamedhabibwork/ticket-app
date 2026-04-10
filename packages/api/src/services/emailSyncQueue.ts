import { Queue } from "bullmq";
import { getRedis } from "../lib/redis";

export const EMAIL_SYNC_QUEUE = "email-sync";

export type EmailSyncJobData = {
  mailboxId: number;
  forceFullSync?: boolean;
};

let emailSyncQueue: Queue<EmailSyncJobData> | null = null;

function getEmailSyncQueue(): Queue<EmailSyncJobData> {
  if (!emailSyncQueue) {
    emailSyncQueue = new Queue<EmailSyncJobData>(EMAIL_SYNC_QUEUE, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return emailSyncQueue;
}

export async function queueEmailSync(mailboxId: number, forceFullSync = false): Promise<void> {
  const queue = getEmailSyncQueue();
  await queue.add(
    "sync-emails",
    { mailboxId, forceFullSync },
    {
      jobId: `email-sync-${mailboxId}-${Date.now()}`,
    },
  );
}
