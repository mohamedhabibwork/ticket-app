import type { Context } from "@ticket-app/api/context";
import { env } from "@ticket-app/env/server";

export interface CustomDomainContext {
  resolvedDomain: string | null;
  isCustomDomain: boolean;
  organizationId: number | null;
}

const DEFAULT_DOMAIN = env.DEFAULT_DOMAIN;
const SUBDOMAIN_SUFFIX: string = env.SUBDOMAIN_SUFFIX || "ticket.cloud.habib.cloud";

export async function resolveCustomDomain(context: Context): Promise<CustomDomainContext> {
  const host = context.headers?.host || context.headers?.Host || "";

  if (!host) {
    return { resolvedDomain: null, isCustomDomain: false, organizationId: null };
  }

  const hostname = host.split(":")[0] ?? "";

  if (DEFAULT_DOMAIN && hostname === DEFAULT_DOMAIN) {
    return { resolvedDomain: hostname, isCustomDomain: false, organizationId: null };
  }

  const customDomain = hostname;

  const orgFromSubdomain = extractSubdomain(hostname, SUBDOMAIN_SUFFIX);
  if (orgFromSubdomain) {
    return {
      resolvedDomain: hostname,
      isCustomDomain: false,
      organizationId: null,
    };
  }

  return {
    resolvedDomain: customDomain,
    isCustomDomain: true,
    organizationId: null,
  };
}

function extractSubdomain(hostname: string, suffix: string): string | null {
  if (hostname.endsWith(`.${suffix}`)) {
    return hostname.slice(0, hostname.length - suffix.length - 1);
  }
  return null;
}

export function getBaseUrl(context: Context, protocol: "http" | "https" = "https"): string {
  const host = context.headers?.host || context.headers?.Host || "";
  return `${protocol}://${host}`;
}

export function buildCustomDomainUrl(
  context: Context,
  path: string,
  protocol: "http" | "https" = "https",
): string {
  const baseUrl = getBaseUrl(context, protocol);
  return `${baseUrl}${path}`;
}
