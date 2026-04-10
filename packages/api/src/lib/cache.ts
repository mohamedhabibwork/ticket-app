import Redis from "ioredis";
import { env } from "@ticket-app/env/server";

function log(level: "warn" | "error", message: string, ctx?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...ctx };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.warn(JSON.stringify(entry));
  }
}

export interface CacheConfig {
  ttl: number;
  prefix: string;
}

export const CACHE_TTL = {
  SESSION: 86400,
  ORG_SETTINGS: 3600,
  ROLE_PERMISSIONS: 1800,
  USER_PROFILE: 900,
  LOOKUPS: 7200,
  TICKET_COUNTS: 60,
} as const;

export const CACHE_KEYS = {
  SESSION: (userId: string) => `session:${userId}`,
  ORG_SETTINGS: (orgId: string) => `org:${orgId}:settings`,
  ROLE_PERMISSIONS: (roleId: string) => `role:${roleId}:permissions`,
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  LOOKUPS: (orgId: string) => `org:${orgId}:lookups`,
  TICKET_COUNT: (orgId: string, statusId?: string) =>
    statusId ? `org:${orgId}:tickets:status:${statusId}` : `org:${orgId}:tickets:count`,
  SAML_CONFIG: (orgId: string) => `org:${orgId}:saml`,
} as const;

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redis.on("error", (err) => {
      log("error", "Redis cache error", { error: String(err) });
    });
  }
  return redis;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      log("warn", "Cache get error", { key, error: String(error) });
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const client = getRedisClient();
      await client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      log("warn", "Cache set error", { key, error: String(error) });
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (error) {
      log("warn", "Cache delete error", { key, error: String(error) });
    }
  },

  async deletePattern(pattern: string): Promise<void> {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      log("warn", "Cache delete pattern error", { pattern, error: String(error) });
    }
  },

  async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttlSeconds);
    return data;
  },
};

export async function invalidateSessionCache(userId: string): Promise<void> {
  await cache.delete(CACHE_KEYS.SESSION(userId));
}

export async function invalidateOrgSettingsCache(orgId: string): Promise<void> {
  await cache.delete(CACHE_KEYS.ORG_SETTINGS(orgId));
  await cache.deletePattern(`org:${orgId}:*`);
}

export async function invalidateRolePermissionsCache(roleId: string): Promise<void> {
  await cache.delete(CACHE_KEYS.ROLE_PERMISSIONS(roleId));
}

export async function invalidateUserProfileCache(userId: string): Promise<void> {
  await cache.delete(CACHE_KEYS.USER_PROFILE(userId));
}

export async function invalidateLookupsCache(orgId: string): Promise<void> {
  await cache.delete(CACHE_KEYS.LOOKUPS(orgId));
}

export async function invalidateTicketCountsCache(orgId: string): Promise<void> {
  await cache.deletePattern(`org:${orgId}:tickets:*`);
}

export async function invalidateSamlCache(orgId: string): Promise<void> {
  await cache.delete(CACHE_KEYS.SAML_CONFIG(orgId));
}
