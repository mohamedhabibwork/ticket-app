import type { Context } from "@ticket-app/api/context";
import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";
import { organizations } from "@ticket-app/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export interface TenantContext {
  organizationId: number;
  organization: {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    subdomain: string;
    customDomain: string | null;
    customDomainVerified: boolean;
    isActive: boolean;
    locale: string;
    timezone: string;
  };
  isRTL: boolean;
}

const SUBDOMAIN_SUFFIX = process.env.SUBDOMAIN_SUFFIX || "support.app";
const DEFAULT_DOMAIN = process.env.DEFAULT_DOMAIN;

export async function resolveTenantFromHost(host: string): Promise<number | null> {
  if (!host) return null;

  const hostname = host.split(":")[0];

  if (DEFAULT_DOMAIN && hostname === DEFAULT_DOMAIN) {
    return null;
  }

  if (hostname.endsWith(`.${SUBDOMAIN_SUFFIX}`)) {
    const subdomain = hostname.slice(0, hostname.length - SUBDOMAIN_SUFFIX.length - 1);
    return resolveTenantFromSubdomain(subdomain);
  }

  return resolveTenantFromCustomDomain(hostname);
}

export async function resolveTenantFromSubdomain(subdomain: string): Promise<number | null> {
  const org = await db.query.organizations.findFirst({
    where: and(
      eq(organizations.subdomain, subdomain),
      eq(organizations.isActive, true),
      isNull(organizations.deletedAt),
    ),
    columns: {
      id: true,
    },
  });
  return org?.id ?? null;
}

export async function resolveTenantFromCustomDomain(domain: string): Promise<number | null> {
  const org = await db.query.organizations.findFirst({
    where: and(
      eq(organizations.customDomain, domain),
      eq(organizations.customDomainVerified, true),
      eq(organizations.isActive, true),
      isNull(organizations.deletedAt),
    ),
    columns: {
      id: true,
    },
  });
  return org?.id ?? null;
}

export async function getTenantContext(organizationId: number): Promise<TenantContext | null> {
  const org = await db.query.organizations.findFirst({
    where: and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)),
  });

  if (!org) return null;

  const rtlLocales = ["ar", "he", "fa", "ur"];
  const isRTL = rtlLocales.includes(org.locale.toLowerCase());

  return {
    organizationId: org.id,
    organization: {
      id: org.id,
      uuid: org.uuid,
      name: org.name,
      slug: org.slug,
      subdomain: org.subdomain,
      customDomain: org.customDomain,
      customDomainVerified: org.customDomainVerified,
      isActive: org.isActive,
      locale: org.locale,
      timezone: org.timezone,
    },
    isRTL,
  };
}

export async function tenantMiddleware(context: Context): Promise<void> {
  if (!context.organizationId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Organization context is required",
    });
  }

  const tenantContext = await getTenantContext(Number(context.organizationId));

  if (!tenantContext) {
    throw new ORPCError("NOT_FOUND", {
      message: "Organization not found",
    });
  }

  if (!tenantContext.organization.isActive) {
    throw new ORPCError("FORBIDDEN", {
      message: "Organization is inactive",
    });
  }

  context.tenant = tenantContext;
}

export function createTenantFilter(organizationId: number) {
  return (table: { organizationId: unknown }) => eq(table.organizationId, organizationId);
}

export function assertTenantAccess(context: Context, organizationId: number): void {
  if (!context.tenant) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Tenant context not available",
    });
  }

  if (context.tenant.organizationId !== organizationId) {
    throw new ORPCError("FORBIDDEN", {
      message: "Access denied to this organization",
    });
  }
}

declare module "@ticket-app/api/context" {
  interface Context {
    tenant?: TenantContext;
  }
}
