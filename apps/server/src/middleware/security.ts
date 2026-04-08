import { env } from "@ticket-app/env/server";

export function securityHeaders() {
  return async function securityHeadersMiddleware(
    c: { res: { headers: Map<string, string> } },
    next: () => Promise<void>,
  ) {
    await next();

    c.res.headers.set("X-Content-Type-Options", "nosniff");
    c.res.headers.set("X-Frame-Options", "DENY");
    c.res.headers.set("X-XSS-Protection", "1; mode=block");
    c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    if (env.NODE_ENV === "production") {
      c.res.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }
  };
}

export function corsMiddleware() {
  return async function corsMiddlewareHandler(
    c: {
      req: { method: string; headers: Record<string, string> };
      res: { headers: Map<string, string> };
    },
    next: () => Promise<void>,
  ) {
    const origin = c.req.headers["origin"] || c.req.headers["Origin"];

    if (origin && env.CORS_ORIGIN.split(",").some((o) => o.trim() === origin)) {
      c.res.headers.set("Access-Control-Allow-Origin", origin);
      c.res.headers.set("Access-Control-Allow-Credentials", "true");
      c.res.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      c.res.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      c.res.headers.set("Access-Control-Max-Age", "86400");
    }

    if (c.req.method === "OPTIONS") {
      return;
    }

    await next();
  };
}
