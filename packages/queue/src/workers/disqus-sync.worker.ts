import { Worker, Job, Queue } from "bullmq";
import { eq, and, sql } from "drizzle-orm";

import { db } from "@ticket-app/db";
import { disqusAccounts, tickets, ticketMessages, lookups } from "@ticket-app/db/schema";
import { getRedis } from "../redis";
import { env } from "@ticket-app/env/server";
import { createDisqusClient } from "@ticket-app/shared/disqus";
import { decryptToken } from "@ticket-app/shared/crypto";

const DISQUS_SYNC_QUEUE = `${env.QUEUE_PREFIX}-disqus-sync`;

export interface DisqusSyncJobData {
  type: "sync-comments" | "sync-threads";
  accountId?: number;
}

const disqusSyncQueue = new Queue<DisqusSyncJobData>(DISQUS_SYNC_QUEUE, {
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

export async function addDisqusSyncJob(
  data: DisqusSyncJobData,
  options?: { delay?: number; repeat?: { every: number } },
): Promise<Job<DisqusSyncJobData>> {
  return disqusSyncQueue.add("disqus-sync", data, options);
}

export async function scheduleDisqusSync(
  accountId: number,
  intervalMinutes: number = 5,
): Promise<void> {
  await disqusSyncQueue.add(
    "disqus-sync",
    { type: "sync-comments", accountId },
    {
      repeat: { every: intervalMinutes * 60 * 1000 },
      jobId: `disqus-sync-${accountId}`,
    },
  );
}

export function createDisqusSyncWorker(): Worker {
  return new Worker(
    DISQUS_SYNC_QUEUE,
    async (job: Job<DisqusSyncJobData>) => {
      const { type, accountId } = job.data;

      switch (type) {
        case "sync-comments":
          if (accountId) await syncDisqusComments(accountId);
          break;
        case "sync-threads":
          if (accountId) await syncDisqusThreads(accountId);
          break;
      }
    },
    {
      connection: getRedis(),
      concurrency: 2,
    },
  );
}

async function syncDisqusComments(accountId: number): Promise<void> {
  console.log(`[Disqus-Sync] Syncing comments for account ${accountId}`);

  const account = await db.query.disqusAccounts.findFirst({
    where: and(eq(disqusAccounts.id, accountId), eq(disqusAccounts.status, "active")),
  });

  if (!account) {
    console.log(`[Disqus-Sync] Account ${accountId} not found or inactive`);
    return;
  }

  try {
    const client = createDisqusClient({
      apiKey: decryptToken(account.apiKeyEnc),
      apiSecret: decryptToken(account.apiSecretEnc),
      accessToken: account.accessTokenEnc ? decryptToken(account.accessTokenEnc) : undefined,
    });

    const posts = await client.listPosts(account.forumShortname);

    console.log(`[Disqus-Sync] Found ${posts.length} posts`);

    let synced = 0;

    for (const post of posts) {
      try {
        await processDisqusPost(account, post);
        synced++;
      } catch (err) {
        console.error(`[Disqus-Sync] Failed to process post ${post.id}:`, err);
      }
    }

    console.log(`[Disqus-Sync] Synced ${synced} posts for account ${accountId}`);
  } catch (err) {
    console.error(`[Disqus-Sync] Error syncing comments for account ${accountId}:`, err);
    throw err;
  }
}

async function processDisqusPost(
  account: typeof disqusAccounts.$inferSelect,
  post: {
    id: string;
    message: string;
    html?: string;
    createdAt: string;
    author: { id: string; name: string; username: string };
    thread?: { id: string; identifier: string; title?: string };
    parent?: string;
  },
): Promise<void> {
  const existingMessage = await db.query.marketplaceMessages?.findFirst({
    where: and(sql`marketplace_account_id = ${account.id}`, sql`platform_message_id = ${post.id}`),
  });

  if (existingMessage) {
    return;
  }

  const channelLookup = await db.query.lookups.findFirst({
    where: and(
      eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'channel')`),
      sql`${lookups.metadata}->>'slug' = 'disqus'`,
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
        eq(lookups.lookupTypeId, sql`(SELECT id FROM lookup_types WHERE name = 'ticket_priority')`),
        eq(lookups.isDefault, true),
      ),
    })
  )?.id;

  const threadTitle =
    post.thread?.title || `Disqus: ${post.author.name} - ${post.message.substring(0, 50)}`;

  const [ticket] = await db
    .insert(tickets)
    .values({
      organizationId: account.organizationId,
      subject: threadTitle.substring(0, 255),
      descriptionHtml: post.html || `<p>${post.message}</p>`,
      channelId: channelLookup?.id,
      statusId: defaultStatusId,
      priorityId: defaultPriorityId,
      createdBy: account.createdBy,
    })
    .returning();

  await db
    .insert(ticketMessages)
    .values({
      ticketId: ticket.id,
      authorType: "contact",
      messageType: "disqus",
      bodyHtml: post.html || `<p>${post.message}</p>`,
      bodyText: post.message,
      createdBy: account.createdBy,
    })
    .returning();

  console.log(`[Disqus-Sync] Created ticket for post ${post.id}`);
}

async function syncDisqusThreads(accountId: number): Promise<void> {
  console.log(`[Disqus-Sync] Syncing threads for account ${accountId}`);
}

export async function closeDisqusSyncQueue(): Promise<void> {
  await disqusSyncQueue.close();
}

export { Worker, Job, Queue };
