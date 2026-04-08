import { ORPCError } from "@orpc/server";

export function errorMiddleware() {
  return function errorHandler(error: unknown, operation?: { name?: string }) {
    console.error(`[ORPC Error] ${operation?.name || "unknown"}:`, error);

    if (error instanceof ORPCError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        return new ORPCError("SERVICE_UNAVAILABLE", {
          message: "Database connection failed",
        });
      }

      if (error.message.includes("ENOTFOUND") || error.message.includes("ETIMEDOUT")) {
        return new ORPCError("SERVICE_UNAVAILABLE", {
          message: "External service unavailable",
        });
      }
    }

    return new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "An unexpected error occurred",
    });
  };
}
