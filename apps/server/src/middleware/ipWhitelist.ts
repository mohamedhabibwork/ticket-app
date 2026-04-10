import type { Context } from "@ticket-app/api/context";
import { db } from "@ticket-app/db";
import { ipWhitelist } from "@ticket-app/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface IpWhitelistConfig {
  enabled: boolean;
  allowInternal: boolean;
  internalRanges: string[];
}

const DEFAULT_CONFIG: IpWhitelistConfig = {
  enabled: true,
  allowInternal: true,
  internalRanges: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.1/32"],
};

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

function _ipToRange(startIp: string, endIp: string): { start: number; end: number } {
  return { start: ipToNumber(startIp), end: ipToNumber(endIp) };
}

function parseCidr(cidr: string): { start: number; end: number } | null {
  const [ip, bits] = cidr.split("/");
  if (!ip || !bits) return null;

  const numBits = parseInt(bits, 10);
  if (numBits < 0 || numBits > 32) return null;

  const ipNum = ipToNumber(ip);
  const mask = ~((1 << (32 - numBits)) - 1);
  const start = ipNum & mask;
  const end = start | ~mask;

  return { start, end };
}

function isIpInRange(ip: string, start: number, end: number): boolean {
  const ipNum = ipToNumber(ip);
  return ipNum >= start && ipNum <= end;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const range = parseCidr(cidr);
  if (!range) return false;
  return isIpInRange(ip, range.start, range.end);
}

function isInternalIp(ip: string, config: IpWhitelistConfig): boolean {
  if (!config.allowInternal) return false;
  return config.internalRanges.some((range) => isIpInCidr(ip, range));
}

function extractClientIp(context: Context): string {
  const ip =
    context.headers?.["x-forwarded-for"] ||
    context.headers?.["X-Forwarded-For"] ||
    context.headers?.["x-real-ip"] ||
    context.headers?.["X-Real-IP"] ||
    context.headers?.["cf-connecting-ip"] ||
    context.headers?.["CF-Connecting-IP"] ||
    "unknown";

  const forwardedFor = Array.isArray(ip) ? ip[0] : ip?.split(",")[0]?.trim() || ip;
  return forwardedFor || "unknown";
}

export async function checkIpWhitelist(
  organizationId: number,
  clientIp: string,
  _context: Context,
): Promise<{ allowed: boolean; reason?: string }> {
  if (clientIp === "unknown" || clientIp === "127.0.0.1") {
    return { allowed: true };
  }

  try {
    const whitelistEntries = await db
      .select({ ipRange: ipWhitelist.ipRange, isActive: ipWhitelist.isActive })
      .from(ipWhitelist)
      .where(
        and(eq(ipWhitelist.organizationId, Number(organizationId)), eq(ipWhitelist.isActive, true)),
      );

    if (whitelistEntries.length === 0) {
      return { allowed: true };
    }

    const normalizedClientIp = clientIp.replace(/^::ffff:/, "");

    for (const entry of whitelistEntries) {
      if (isIpInCidr(normalizedClientIp, entry.ipRange)) {
        return { allowed: true };
      }
    }

    logger.warn("IP blocked by whitelist", {
      organizationId,
      clientIp: normalizedClientIp,
      whitelistedRanges: whitelistEntries.map((e) => e.ipRange),
    });

    return {
      allowed: false,
      reason: `IP address ${normalizedClientIp} is not in the organization's allowed IP list`,
    };
  } catch (error) {
    logger.error("IP whitelist check failed", { error, organizationId, clientIp });
    return { allowed: true };
  }
}

export function ipWhitelistMiddleware(config: IpWhitelistConfig = DEFAULT_CONFIG) {
  return async function ipWhitelistHandler(
    context: Context,
    operation: { name?: string },
    handler: () => Promise<unknown>,
  ): Promise<unknown> {
    const organizationId = context.session?.organizationId
      ? parseInt(context.session.organizationId, 10)
      : null;

    if (!organizationId) {
      return handler();
    }

    const clientIp = extractClientIp(context);

    if (isInternalIp(clientIp, config)) {
      return handler();
    }

    const { allowed, reason } = await checkIpWhitelist(organizationId, clientIp, context);

    if (!allowed) {
      logger.warn("IP whitelist blocked request", {
        organizationId,
        clientIp,
        operation: operation.name,
        reason,
      });

      throw new Error(`Access denied: ${reason}`);
    }

    return handler();
  };
}
