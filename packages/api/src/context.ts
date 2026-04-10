import type { Context as HonoContext } from "hono";

export interface SessionData {
  userId: string;
  organizationId: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TenantData {
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

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext(options: CreateContextOptions) {
  const headers: Record<string, string> = {};
  const rawHeaders = options.context.req.raw.headers;
  rawHeaders.forEach((value: string, key: string) => {
    headers[key] = value;
  });

  let session: SessionData | null = null;
  const authHeader = headers["authorization"] || headers["Authorization"];

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      try {
        const { sessions } = await import("@ticket-app/db/lib/sessions");
        const sessionData = await sessions.get(token);
        if (sessionData && new Date(sessionData.expiresAt) > new Date()) {
          session = sessionData;
        }
      } catch {
        session = null;
      }
    }
  }

  return {
    auth: session,
    session,
    headers,
    organizationId: null as string | null,
    tenant: null as TenantData | null,
    db: null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
