import { env } from "@ticket-app/env/server";
import Redis from "ioredis";

export interface SessionData {
  userId: string;
  organizationId: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

const redis = new Redis(env.REDIS_URL);

export const sessions = {
  async get(token: string): Promise<SessionData | null> {
    const data = await redis.get(`${env.QUEUE_PREFIX}-session:${token}`);
    if (!data) return null;
    return JSON.parse(data) as SessionData;
  },

  async set(token: string, data: SessionData, ttlSeconds: number = 86400): Promise<void> {
    await redis.setex(`${env.QUEUE_PREFIX}-session:${token}`, ttlSeconds, JSON.stringify(data));
  },

  async delete(token: string): Promise<void> {
    await redis.del(`${env.QUEUE_PREFIX}-session:${token}`);
  },

  async exists(token: string): Promise<boolean> {
    const exists = await redis.exists(`${env.QUEUE_PREFIX}-session:${token}`);
    return exists === 1;
  },

  async refresh(token: string, ttlSeconds: number = 86400): Promise<void> {
    await redis.expire(`${env.QUEUE_PREFIX}-session:${token}`, ttlSeconds);
  },

  async deleteByUserId(userId: string): Promise<void> {
    const keys = await redis.keys(`${env.QUEUE_PREFIX}-session:*`);
    const userKeys: string[] = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const session = JSON.parse(data) as SessionData;
        if (session.userId === userId) {
          userKeys.push(key);
        }
      }
    }

    if (userKeys.length > 0) {
      await redis.del(...userKeys);
    }
  },
};

export { redis };
