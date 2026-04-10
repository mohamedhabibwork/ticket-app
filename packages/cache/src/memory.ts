import { LRUCache } from "lru-cache";
import type { CacheDriver, DriverOptions } from "./driver";
import { withPrefix } from "./utils";

function log(level: "warn" | "error", message: string, ctx?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...ctx };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.warn(JSON.stringify(entry));
  }
}

interface CacheEntry<T> {
  value: T;
  ttl: number | undefined;
}

export function createMemoryDriver(options: DriverOptions = {}): CacheDriver {
  const prefix = options.prefix || "cache";
  const defaultTTL = options.ttl || 3600;

  const cache = new LRUCache<string, CacheEntry<unknown>>({
    max: 1000,
    ttl: defaultTTL * 1000,
  });

  return {
    name: "memory" as const,

    async get<T>(key: string): Promise<T | null> {
      try {
        const prefixedKey = withPrefix(key, prefix);
        const entry = cache.get(prefixedKey);
        if (!entry) return null;
        return entry.value as T;
      } catch (error) {
        log("warn", "Memory get error", { key, error: String(error) });
        return null;
      }
    },

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      try {
        const prefixedKey = withPrefix(key, prefix);
        const entryTTL = ttl || defaultTTL;
        cache.set(prefixedKey, { value, ttl: entryTTL }, { ttl: entryTTL * 1000 });
      } catch (error) {
        log("warn", "Memory set error", { key, error: String(error) });
      }
    },

    async delete(key: string): Promise<void> {
      try {
        const prefixedKey = withPrefix(key, prefix);
        cache.delete(prefixedKey);
      } catch (error) {
        log("warn", "Memory delete error", { key, error: String(error) });
      }
    },

    async deletePattern(pattern: string): Promise<void> {
      try {
        const fullPattern = withPrefix(pattern, prefix);
        const regex = new RegExp(`^${fullPattern.replace(/\*/g, ".*")}$`);
        const keysToDelete: string[] = [];

        for (const key of cache.keys()) {
          if (regex.test(key)) {
            keysToDelete.push(key);
          }
        }

        for (const key of keysToDelete) {
          cache.delete(key);
        }
      } catch (error) {
        log("warn", "Memory deletePattern error", { pattern, error: String(error) });
      }
    },

    async exists(key: string): Promise<boolean> {
      try {
        const prefixedKey = withPrefix(key, prefix);
        return cache.has(prefixedKey);
      } catch (error) {
        log("warn", "Memory exists error", { key, error: String(error) });
        return false;
      }
    },

    async close(): Promise<void> {
      cache.clear();
    },
  };
}
