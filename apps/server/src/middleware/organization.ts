import type { Context } from "@ticket-app/api/context";
import { ORPCError } from "@orpc/server";

export async function organizationMiddleware(context: Context): Promise<void> {
  if (!context.organizationId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Organization context is required",
    });
  }
}
