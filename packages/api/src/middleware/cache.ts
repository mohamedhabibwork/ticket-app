import { cache, CACHE_TTL, CACHE_KEYS } from "../lib/cache";
import type { Context } from "../context";
import { createHash } from "crypto";

export interface CacheOptions {
  ttl?: number;
  cacheKey?: string;
  cacheKeyGenerator?: (context: Context, params?: Record<string, unknown>) => string;
  skipCache?: (context: Context) => boolean;
}

export function generateETag(data: unknown): string {
  const content = JSON.stringify(data);
  return createHash("md5").update(content).digest("hex");
}

export function parseETag(etag: string | undefined): string | null {
  if (!etag) return null;
  const cleaned = etag.replace(/^["']|["']$/g, "");
  return cleaned.startsWith("W/") ? cleaned.slice(2) : cleaned;
}

export function checkIfModified(
  ifNoneMatch: string | undefined,
  etag: string
): boolean {
  const parsed = parseETag(ifNoneMatch);
  if (!parsed) return false;
  return parsed !== etag;
}

export async function getCachedResponse<T>(
  cacheKey: string
): Promise<{ data: T | null; etag: string | null }> {
  const cached = await cache.get<{ data: T; etag: string }>(cacheKey);
  if (cached) {
    return { data: cached.data, etag: cached.etag };
  }
  return { data: null, etag: null };
}

export async function setCachedResponse<T>(
  cacheKey: string,
  data: T,
  ttl: number
): Promise<string> {
  const etag = generateETag(data);
  await cache.set(cacheKey, { data, etag }, ttl);
  return etag;
}

export function responseCacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = CACHE_TTL.ORG_SETTINGS,
    cacheKey,
    cacheKeyGenerator,
    skipCache = () => false,
  } = options;

  return async function cacheHandler(
    context: Context,
    operation: { name?: string },
    handler: () => Promise<unknown>
  ): Promise<unknown> {
    if (skipCache(context)) {
      return handler();
    }

    const key = cacheKey || cacheKeyGenerator?.(context, context.organizationId as unknown as Record<string, unknown>);
    if (!key) {
      return handler();
    }

    const { data: cachedData, etag: cachedETag } = await getCachedResponse<unknown>(key);

    const ifNoneMatch = context.headers?.["if-none-match"] || context.headers?.["If-None-Match"];

    if (cachedData !== null && cachedETag) {
      if (checkIfModified(ifNoneMatch, cachedETag)) {
        return handler();
      }

      return new Response(JSON.stringify(cachedData), {
        status: 304,
        headers: {
          "ETag": cachedETag,
          "X-Cache": "HIT",
        },
      });
    }

    const result = await handler();

    if (result instanceof Response) {
      return result;
    }

    const newETag = await setCachedResponse(key, result, ttl);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "ETag": newETag,
        "X-Cache": "MISS",
        "Cache-Control": `private, max-age=${ttl}`,
      },
    });
  };
}

export function getCacheControlHeaders(
  ttl: number,
  isPrivate: boolean = true
): Record<string, string> {
  const visibility = isPrivate ? "private" : "public";
  return {
    "Cache-Control": `${visibility}, max-age=${ttl}`,
    "Vary": "Accept-Encoding",
  };
}

export function getConditionalHeaders(etag: string): Record<string, string> {
  return {
    "ETag": etag,
    "Cache-Control": "must-revalidate",
  };
}

export const HOT_ENDPOINT_CACHE_TTL = {
  LOOKUPS: CACHE_TTL.LOOKUPS,
  ORG_SETTINGS: CACHE_TTL.ORG_SETTINGS,
  TICKET_COUNTS: CACHE_TTL.TICKET_COUNTS,
  USER_PROFILE: CACHE_TTL.USER_PROFILE,
} as const;

export function createHotEndpointCache(
  route: string,
  ttl: number = CACHE_TTL.ORG_SETTINGS
) {
  return responseCacheMiddleware({
    ttl,
    cacheKey: `http:hot:${route}`,
    skipCache: (context) => {
      return !context.auth?.userId;
    },
  });
}
