import { Worker, Job, Queue } from "bullmq";
import { eq, and, sql } from "drizzle-orm";

import { db } from "@ticket-app/db";
import {
  marketplaceAccounts,
  marketplaceMessages,
  tickets,
  ticketMessages,
  lookups,
} from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";
import { createAmazonClient } from "@ticket-app/shared/amazon-sp-api";
import { decryptToken } from "@ticket-app/shared/crypto";

const AMAZON_SYNC_QUEUE = `${env.QUEUE_PREFIX}-amazon-sync`;

export interface AmazonSyncJobData {
  type: "sync-messages" | "sync-orders";
  accountId?: number;
}

const amazonSyncQueue = new Queue<AmazonSyncJobData>(AMAZON_SYNC_QUEUE, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export async function addAmazonSyncJob(
  data: AmazonSyncJobData,
  options?: { delay?: number; repeat?: { every: number } },
): Promise<Job<AmazonSyncJobData>> {
  return amazonSyncQueue.add("amazon-sync", data, options);
}

export async function scheduleAmazonSync(
  accountId: number,
  intervalMinutes: number = 15,
): Promise<void> {
  await amazonSyncQueue.add(
    "amazon-sync",
    { type: "sync-messages", accountId },
    {
      repeat: { every: intervalMinutes * 60 * 1000 },
      jobId: `amazon-sync-${accountId}`,
    },
  );
}

export function createAmazonSyncWorker(): Worker {
  return new Worker(
    AMAZON_SYNC_QUEUE,
    async (job: Job<AmazonSyncJobData>) => {
      const { type, accountId } = job.data;

      switch (type) {
        case "sync-messages":
          if (accountId) await syncAmazonMessages(accountId);
          break;
        case "sync-orders":
          if (accountId) await syncAmazonOrders(accountId);
          break;
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    },
  );
}

async function syncAmazonMessages(accountId: number): Promise<void> {
  console.log(`[Amazon-Sync] Syncing messages for account ${accountId}`);

  const account = await db.query.marketplaceAccounts.findFirst({
    where: and(eq(marketplaceAccounts.id, accountId), eq(marketplaceAccounts.status, "active")),
  });

  if (!account) {
    console.log(`[Amazon-Sync] Account ${accountId} not found or inactive`);
    return;
  }

  try {
    const client = createAmazonClient({
      clientId: account.spApiClientIdEnc ? decryptToken(account.spApiClientIdEnc) : "",
      clientSecret: account.spApiClientSecretEnc ? decryptToken(account.spApiClientSecretEnc) : "",
      marketplaceId: account.marketplaceId || "ATVPDKIKX0DER",
    });

    if (account.spApiRefreshTokenEnc) {
      client.setTokens({
        accessToken: "",
        refreshToken: decryptToken(account.spApiRefreshTokenEnc),
        expiresAt: new Date(),
      });
    }

    const since = account.lastSyncedAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orders = await client.getOrders(since);

    console.log(`[Amazon-Sync] Found ${orders.length} orders for account ${accountId}`);

    let synced = 0;

    for (const order of orders) {
      try {
        await processAmazonOrder(account, order, client);
        synced++;
      } catch (err) {
        console.error(`[Amazon-Sync] Failed to process order ${order.orderId}:`, err);
      }
    }

    await db
      .update(marketplaceAccounts)
      .set({
        lastSyncedAt: new Date(),
      })
      .where(eq(marketplaceAccounts.id, accountId));

    console.log(`[Amazon-Sync] Synced ${synced} orders for account ${accountId}`);
  } catch (err) {
    console.error(`[Amazon-Sync] Error syncing messages for account ${accountId}:`, err);
    throw err;
  }
}

async function processAmazonOrder(
  account: typeof marketplaceAccounts.$inferSelect,
  order: {
    orderId: string;
    buyerEmail?: string;
    buyerName?: string;
    orderStatus: string;
    items?: Array<{ asin: string; title: string; quantityOrdered: number }>;
  },
  client: ReturnType<typeof createAmazonClient>,
): Promise<void> {
  const messages = await client.getMessagingMessages(order.orderId);

  for (const message of messages) {
    const existingMessage = await db.query.marketplaceMessages.findFirst({
      where: and(
        eq(marketplaceMessages.marketplaceAccountId, account.id),
        eq(marketplaceMessages.platformMessageId, message.messageId),
      ),
    });

    if (existingMessage) {
      continue;
    }

    const channelLookup = await db.query.lookups.findFirst({
      where: and(
        eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'channel')`),
        sql`${lookups.metadata}->>'slug' = 'amazon_seller'`,
      ),
    });

    const defaultStatusId = (
      await db.query.lookups.findFirst({
        where: and(
          eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'ticket_status')`),
          eq(lookups.isDefault, true),
        ),
      })
    )?.id;

    const defaultPriorityId = (
      await db.query.lookups.findFirst({
        where: and(
          eq(
            lookups.lookupTypeId,
            sql`(SELECT id FROM lookup_types WHERE name = 'ticket_priority')`,
          ),
          eq(lookups.isDefault, true),
        ),
      })
    )?.id;

    const itemTitles = order.items?.map((i) => i.title).join(", ") || "Amazon Order";
    const subject = `Amazon: ${order.buyerName || order.buyerEmail || "Buyer"} - ${itemTitles.substring(0, 50)}`;

    const [ticket] = await db
      .insert(tickets)
      .values({
        organizationId: account.organizationId,
        subject: subject.substring(0, 255),
        descriptionHtml: `<p>${message.messageContent}</p>`,
        channelId: channelLookup?.id,
        statusId: defaultStatusId,
        priorityId: defaultPriorityId,
        createdBy: account.createdBy,
      })
      .returning();

    await db
      .insert(marketplaceMessages)
      .values({
        marketplaceAccountId: account.id,
        ticketId: ticket.id,
        platformMessageId: message.messageId,
        amazonOrderId: order.orderId,
        buyerEmail: order.buyerEmail,
        buyerName: order.buyerName,
        subject: message.subject,
        body: message.messageContent,
        direction: "incoming",
        receivedAt: new Date(message.creationDate),
      })
      .returning();

    await db
      .insert(ticketMessages)
      .values({
        ticketId: ticket.id,
        authorType: "contact",
        messageType: "amazon_seller",
        bodyHtml: `<p>${message.messageContent}</p>`,
        bodyText: message.messageContent,
        createdBy: account.createdBy,
      })
      .returning();

    console.log(`[Amazon-Sync] Created ticket for order ${order.orderId}`);
  }
}

async function syncAmazonOrders(accountId: number): Promise<void> {
  console.log(`[Amazon-Sync] Syncing orders for account ${accountId}`);
}

export async function closeAmazonSyncQueue(): Promise<void> {
  await amazonSyncQueue.close();
}

export { Worker, Job, Queue };
