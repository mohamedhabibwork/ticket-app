export interface AuthenticatedUser {
  userId: number;
  organizationId: number;
  sessionId: string;
}

export interface SocketData {
  user: AuthenticatedUser;
  rooms: Set<string>;
}

export async function validateToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const { sessions } = await import("@ticket-app/db/lib/sessions");
    const sessionData = await sessions.get(token);

    if (!sessionData) {
      return null;
    }

    if (new Date(sessionData.expiresAt) < new Date()) {
      return null;
    }

    return {
      userId: parseInt(sessionData.userId, 10),
      organizationId: parseInt(sessionData.organizationId, 10),
      sessionId: token,
    };
  } catch {
    return null;
  }
}

export function authMiddleware(token: string): AuthenticatedUser | null {
  const syncValidate = (token: string): AuthenticatedUser | null => {
    try {
      const { sessions } = require("@ticket-app/db/lib/sessions");
      const sessionData = sessions.getSync(token);

      if (!sessionData) {
        return null;
      }

      if (new Date(sessionData.expiresAt) < new Date()) {
        return null;
      }

      return {
        userId: parseInt(sessionData.userId, 10),
        organizationId: parseInt(sessionData.organizationId, 10),
        sessionId: token,
      };
    } catch {
      return null;
    }
  };

  return syncValidate(token);
}

export function parseAuthToken(url: URL): string | null {
  return url.searchParams.get("token");
}

export function getUserFromRequest(req: Request): AuthenticatedUser | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  return authMiddleware(token);
}
