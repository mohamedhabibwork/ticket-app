import type { Context as HonoContext } from "hono";

export interface SessionData {
  userId: string;
  organizationId: string;
  expiresAt: string;
}

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext(_options: CreateContextOptions) {
  return {
    auth: null,
    session: null as SessionData | null,
    headers: {} as Record<string, string>,
    organizationId: null as string | null,
    db: null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
