import type { Context } from "hono";
import { env } from "@ticket-app/env/server";

export function securityHeaders() {
  return async function securityHeadersMiddleware(
    c: { res: { headers: Headers } },
    next: () => Promise<void>,
  ) {
    await next();

    c.res.headers.set("X-Content-Type-Options", "nosniff");
    c.res.headers.set("X-Frame-Options", "DENY");
    c.res.headers.set("X-XSS-Protection", "1; mode=block");
    c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    if (env.NODE_ENV === "production") {
      c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
  };
}

export function corsMiddleware() {
  return async function corsMiddlewareHandler(c: Context, next: () => Promise<void>) {
    const origin = c.req.header("origin");
    const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

    if (origin && allowedOrigins.some((o) => o === origin || o === "*")) {
      c.res.headers.set("Access-Control-Allow-Origin", origin);
      c.res.headers.set("Access-Control-Allow-Credentials", "true");
      c.res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      c.res.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      c.res.headers.set("Access-Control-Max-Age", "86400");
    }

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  };
}
