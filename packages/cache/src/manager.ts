import { env } from "@ticket-app/env/server";
import type { CacheDriver } from "./driver";
import { createRedisDriver } from "./redis";
import { createMemoryDriver } from "./memory";
import { CACHE_KEYS, CACHE_TTL, type CacheTTLKey } from "./types";

let manager: CacheManager | null = null;

export class CacheManager {
  public driver: CacheDriver;
  public prefix: string;

  constructor(driver: CacheDriver, prefix: string = "ticket-app") {
    this.driver = driver;
    this.prefix = prefix;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.driver.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.driver.set<T>(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    return this.driver.deletePattern(pattern);
  }

  async exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }

  async close(): Promise<void> {
    return this.driver.close();
  }
}

function createManager(): CacheManager {
  const driverType = env.CACHE_DRIVER as "redis" | "memory";
  const prefix = env.CACHE_PREFIX || "ticket-app";

  let driver: CacheDriver;

  if (driverType === "redis") {
    driver = createRedisDriver({ prefix }, env.REDIS_URL);
  } else {
    driver = createMemoryDriver({ prefix });
  }

  return new CacheManager(driver, prefix);
}

export function getCacheManager(): CacheManager {
  if (!manager) {
    manager = createManager();
  }
  return manager;
}

export function getCacheDriver(): CacheDriver {
  return getCacheManager().driver;
}

export async function invalidateSessionCache(userId: string): Promise<void> {
  await getCacheDriver().delete(CACHE_KEYS.SESSION(userId));
}

export async function invalidateOrgSettingsCache(orgId: string): Promise<void> {
  await getCacheDriver().delete(CACHE_KEYS.ORG_SETTINGS(orgId));
  await getCacheDriver().deletePattern(`org:${orgId}:*`);
}

export async function invalidateRolePermissionsCache(roleId: string): Promise<void> {
  await getCacheDriver().delete(CACHE_KEYS.ROLE_PERMISSIONS(roleId));
}

export async function invalidateUserProfileCache(userId: string): Promise<void> {
  await getCacheDriver().delete(CACHE_KEYS.USER_PROFILE(userId));
}

export async function invalidateLookupsCache(orgId: string): Promise<void> {
  await getCacheDriver().delete(CACHE_KEYS.LOOKUPS(orgId));
}

export async function invalidateTicketCountsCache(orgId: string): Promise<void> {
  await getCacheDriver().deletePattern(`org:${orgId}:tickets:*`);
}

export async function invalidateSamlCache(orgId: string): Promise<void> {
  await getCacheDriver().delete(CACHE_KEYS.SAML_CONFIG(orgId));
}

export { CACHE_KEYS, CACHE_TTL };
export type { CacheTTLKey };
