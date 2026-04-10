import Redis from "ioredis";
import type { CacheDriver, DriverOptions } from "./driver";
import { serialize, deserialize, withPrefix } from "./utils";

function log(level: "warn" | "error", message: string, ctx?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...ctx };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.warn(JSON.stringify(entry));
  }
}

export function createRedisDriver(options: DriverOptions = {}): CacheDriver {
  const prefix = options.prefix || "cache";
  let redis: Redis | null = null;

  function getClient(): Redis {
    if (!redis) {
      // Note: REDIS_URL will be imported from env in the manager
      redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      redis.on("error", (err) => {
        log("error", "Redis driver error", { error: String(err) });
      });
    }
    return redis;
  }

  return {
    name: "redis" as const,

    async get<T>(key: string): Promise<T | null> {
      try {
        const client = getClient();
        const data = await client.get(withPrefix(key, prefix));
        if (!data) return null;
        return deserialize<T>(data);
      } catch (error) {
        log("warn", "Redis get error", { key, error: String(error) });
        return null;
      }
    },

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      try {
        const client = getClient();
        const serialized = serialize(value);
        if (ttl) {
          await client.setex(withPrefix(key, prefix), ttl, serialized);
        } else {
          await client.set(withPrefix(key, prefix), serialized);
        }
      } catch (error) {
        log("warn", "Redis set error", { key, error: String(error) });
      }
    },

    async delete(key: string): Promise<void> {
      try {
        const client = getClient();
        await client.del(withPrefix(key, prefix));
      } catch (error) {
        log("warn", "Redis delete error", { key, error: String(error) });
      }
    },

    async deletePattern(pattern: string): Promise<void> {
      try {
        const client = getClient();
        const fullPattern = withPrefix(pattern, prefix);
        const keys = await client.keys(fullPattern);
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } catch (error) {
        log("warn", "Redis deletePattern error", { pattern, error: String(error) });
      }
    },

    async exists(key: string): Promise<boolean> {
      try {
        const client = getClient();
        const result = await client.exists(withPrefix(key, prefix));
        return result === 1;
      } catch (error) {
        log("warn", "Redis exists error", { key, error: String(error) });
        return false;
      }
    },

    async close(): Promise<void> {
      if (redis) {
        await redis.quit();
        redis = null;
      }
    },
  };
}
