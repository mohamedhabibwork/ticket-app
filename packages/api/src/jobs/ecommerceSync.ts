import { Queue, Worker, Job } from "bullmq";
import { eq } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { ecommerceStores } from "@ticket-app/db/schema";
import { syncShopifyStoreOrders } from "../services/ecommerce/shopify";
import { syncWooCommerceStoreOrders } from "../services/ecommerce/woocommerce";
import { syncSallaStoreOrders } from "../services/ecommerce/salla";
import { syncZidStoreOrders } from "../services/ecommerce/zid";
import { getRedis } from "@ticket-app/queue";

export const ECOMMERCE_SYNC_QUEUE = "ecommerce-sync";

export type EcommerceSyncJobData = {
  storeId: number;
  forceFullSync?: boolean;
};

export const ecommerceSyncQueue = new Queue<EcommerceSyncJobData>(ECOMMERCE_SYNC_QUEUE, {
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

export async function addEcommerceSyncJob(
  storeId: number,
  forceFullSync = false,
): Promise<Job<EcommerceSyncJobData>> {
  return ecommerceSyncQueue.add(
    "sync-store",
    { storeId, forceFullSync },
    {
      jobId: `ecommerce-sync-${storeId}-${Date.now()}`,
    },
  );
}

export async function addAllStoresSyncJob(): Promise<void> {
  const stores = await db.query.ecommerceStores.findMany({
    where: eq(ecommerceStores.isActive, true),
    columns: { id: true },
  });

  for (const store of stores) {
    await addEcommerceSyncJob(store.id);
  }
}

export function createEcommerceSyncWorker() {
  return new Worker<EcommerceSyncJobData>(
    ECOMMERCE_SYNC_QUEUE,
    async (job) => {
      const { storeId, forceFullSync } = job.data;

      const store = await db.query.ecommerceStores.findFirst({
        where: eq(ecommerceStores.id, storeId),
      });

      if (!store || !store.isActive) {
        return { synced: 0, skipped: true };
      }

      await db
        .update(ecommerceStores)
        .set({
          syncStatus: "running",
          updatedAt: new Date(),
        })
        .where(eq(ecommerceStores.id, storeId));

      const sinceDate = forceFullSync
        ? undefined
        : store.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);

      let result: { synced: number; errors: string[] };

      try {
        switch (store.platform) {
          case "shopify":
            result = await syncShopifyStoreOrders(storeId, sinceDate);
            break;
          case "woocommerce":
            result = await syncWooCommerceStoreOrders(storeId, sinceDate);
            break;
          case "salla":
            result = await syncSallaStoreOrders(storeId, sinceDate);
            break;
          case "zid":
            result = await syncZidStoreOrders(storeId, sinceDate);
            break;
          default:
            throw new Error(`Unsupported platform: ${store.platform}`);
        }

        await db
          .update(ecommerceStores)
          .set({
            syncStatus: result.errors.length > 0 ? "error" : "completed",
            lastSyncAt: new Date(),
            syncError: result.errors.length > 0 ? result.errors.join("; ") : null,
            updatedAt: new Date(),
          })
          .where(eq(ecommerceStores.id, storeId));

        return result;
      } catch (err) {
        await db
          .update(ecommerceStores)
          .set({
            syncStatus: "error",
            syncError: err instanceof Error ? err.message : "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(ecommerceStores.id, storeId));

        throw err;
      }
    },
    {
      connection: getRedis(),
      concurrency: 3,
    },
  );
}

export function scheduleEcommerceSyncEvery15Minutes() {
  return ecommerceSyncQueue.add(
    "sync-all-stores",
    { storeId: 0, forceFullSync: false },
    {
      repeat: {
        interval: 15 * 60 * 1000,
      },
      jobId: "ecommerce-sync-all-stores-recurring",
    },
  );
}

export { Worker, Job };
