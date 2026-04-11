import { env } from "@ticket-app/env/server";
import Redis from "ioredis";

export interface SessionData {
  userId: string;
  organizationId: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redis.on("error", (err) => {
      console.error("Redis client error:", err);
    });
  }
  return redis;
}

export function getRedis(): Redis {
  return getRedisClient();
}

export const sessions = {
  async get(token: string): Promise<SessionData | null> {
    const data = await getRedisClient().get(`${env.QUEUE_PREFIX}-session:${token}`);
    if (!data) return null;
    return JSON.parse(data) as SessionData;
  },

  async set(token: string, data: SessionData, ttlSeconds: number = 86400): Promise<void> {
    await getRedisClient().setex(
      `${env.QUEUE_PREFIX}-session:${token}`,
      ttlSeconds,
      JSON.stringify(data),
    );
  },

  async delete(token: string): Promise<void> {
    await getRedisClient().del(`${env.QUEUE_PREFIX}-session:${token}`);
  },

  async exists(token: string): Promise<boolean> {
    const exists = await getRedisClient().exists(`${env.QUEUE_PREFIX}-session:${token}`);
    return exists === 1;
  },

  async refresh(token: string, ttlSeconds: number = 86400): Promise<void> {
    await getRedisClient().expire(`${env.QUEUE_PREFIX}-session:${token}`, ttlSeconds);
  },

  async deleteByUserId(userId: string): Promise<void> {
    const keys = await getRedisClient().keys(`${env.QUEUE_PREFIX}-session:*`);
    const userKeys: string[] = [];

    for (const key of keys) {
      const data = await getRedisClient().get(key);
      if (data) {
        const session = JSON.parse(data) as SessionData;
        if (session.userId === userId) {
          userKeys.push(key);
        }
      }
    }

    if (userKeys.length > 0) {
      await getRedisClient().del(...userKeys);
    }
  },
};
