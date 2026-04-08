import type { Context } from "@ticket-app/api/context";
import { ORPCError } from "@orpc/server";
import { redis } from "@ticket-app/db/lib/sessions";
import { logger } from "../lib/logger";

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyPrefix: string;
}

export const RATE_LIMIT_TIERS = {
  STANDARD: {
    limit: 1000,
    windowMs: 60 * 1000,
    keyPrefix: "rl:standard",
  },
  ENTERPRISE: {
    limit: 5000,
    windowMs: 60 * 1000,
    keyPrefix: "rl:enterprise",
  },
  AUTH: {
    limit: 10,
    windowMs: 60 * 1000,
    keyPrefix: "rl:auth",
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `${config.keyPrefix}:${key}`;
  const windowStart = now - config.windowMs;

  try {
    const multi = redis.multi();
    multi.zremrangebyscore(windowKey, 0, windowStart);
    multi.zadd(windowKey, now, `${now}:${Math.random()}`);
    multi.zcard(windowKey);
    multi.expire(windowKey, Math.ceil(config.windowMs / 1000));

    const results = await multi.exec();
    const requestCount = (results?.[2]?.[1] as number) || 0;

    const allowed = requestCount <= config.limit;
    const remaining = Math.max(0, config.limit - requestCount);
    const resetAt = new Date(now + config.windowMs);

    return { allowed, remaining, resetAt, limit: config.limit };
  } catch (error) {
    logger.warn("Rate limit check failed, allowing request", { error });
    return {
      allowed: true,
      remaining: config.limit,
      resetAt: new Date(now + config.windowMs),
      limit: config.limit,
    };
  }
}

export async function getOrganizationRateLimit(
  organizationId: number | null,
  _context: Context
): Promise<RateLimitConfig> {
  if (!organizationId) {
    return RATE_LIMIT_TIERS.STANDARD;
  }

  return RATE_LIMIT_TIERS.STANDARD;
}

function getClientKey(context: Context): string {
  const apiKey = context.headers?.["x-api-key"] || context.headers?.["X-API-KEY"];
  if (apiKey) {
    return `apikey:${apiKey}`;
  }

  const sessionId = context.session?.userId;
  if (sessionId) {
    return `session:${sessionId}`;
  }

  const ip =
    context.headers?.["x-forwarded-for"] ||
    context.headers?.["X-Forwarded-For"] ||
    context.headers?.["x-real-ip"] ||
    context.headers?.["X-Real-IP"] ||
    "anonymous";

  const forwardedFor = Array.isArray(ip) ? ip[0] : ip?.split(",")[0]?.trim() || ip;
  return `ip:${forwardedFor}`;
}

export function rateLimitMiddleware(tier: RateLimitTier = "STANDARD") {
  const _config = RATE_LIMIT_TIERS[tier];

  return async function rateLimitHandler(
    context: Context,
    operation: { name?: string },
    handler: () => Promise<unknown>
  ): Promise<unknown> {
    const key = getClientKey(context);
    const orgId = context.session?.organizationId
      ? parseInt(context.session.organizationId, 10)
      : null;

    const effectiveConfig = await getOrganizationRateLimit(orgId, context);

    const result = await checkRateLimit(key, effectiveConfig);

    context.headers = {
      ...context.headers,
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": result.resetAt.toISOString(),
    };

    if (!result.allowed) {
      logger.warn("Rate limit exceeded", {
        key,
        operation: operation.name,
        tier,
      });

      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: `Rate limit exceeded. Try again after ${result.resetAt.toISOString()}`,
      });
    }

    return handler();
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
    "Retry-After": String(Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)),
  };
}
