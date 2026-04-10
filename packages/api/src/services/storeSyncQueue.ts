import { Queue } from "bullmq";
import { getRedis } from "../lib/redis";

export const STORE_SYNC_QUEUE = "store-sync";

export type StoreSyncJobData = {
  storeId: number;
  forceFullSync?: boolean;
};

let storeSyncQueue: Queue<StoreSyncJobData> | null = null;

function getStoreSyncQueue(): Queue<StoreSyncJobData> {
  if (!storeSyncQueue) {
    storeSyncQueue = new Queue<StoreSyncJobData>(STORE_SYNC_QUEUE, {
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
  return storeSyncQueue;
}

export async function queueStoreSync(storeId: number, forceFullSync = false): Promise<void> {
  const queue = getStoreSyncQueue();
  await queue.add(
    "sync-store",
    { storeId, forceFullSync },
    {
      jobId: `store-sync-${storeId}-${Date.now()}`,
    },
  );
}
