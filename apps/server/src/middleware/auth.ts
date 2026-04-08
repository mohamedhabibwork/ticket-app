import type { Context } from "@ticket-app/api/context";
import { ORPCError } from "@orpc/server";

export async function authMiddleware(
  context: Context,
): Promise<{ userId: string; organizationId: string; sessionId: string } | null> {
  const authHeader =
    context.headers?.["authorization"] || context.headers?.["Authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.slice(7);

  if (!token) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Invalid or expired session",
    });
  }

  if (context.session) {
    if (new Date(context.session.expiresAt) < new Date()) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Session expired",
      });
    }

    if (context.organizationId && context.session.organizationId !== context.organizationId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Organization mismatch",
      });
    }

    return {
      userId: context.session.userId,
      organizationId: context.session.organizationId,
      sessionId: token,
    };
  }

  return null;
}
