import type { Context } from "@ticket-app/api/context";
import { logger, withRequestContext } from "./lib/logger";
import { extractTraceContext } from "./middleware/tracing";
import { rateLimitMiddleware, type RateLimitTier } from "./middleware/rateLimit";
import { authMiddleware } from "./middleware/auth";
import { organizationMiddleware } from "./middleware/organization";
import { ipWhitelistMiddleware } from "./middleware/ipWhitelist";
import { createAuditLog, type AuditAction } from "./middleware/audit";
import { errors, isStructuredError } from "./utils/errors";
import { ORPCError } from "@orpc/server";

export interface RouterConfig {
  enableTracing?: boolean;
  enableRateLimiting?: boolean;
  enableAuth?: boolean;
  enableTenantIsolation?: boolean;
  enableIpWhitelist?: boolean;
  enableAudit?: boolean;
  defaultRateLimitTier?: RateLimitTier;
}

const DEFAULT_CONFIG: RouterConfig = {
  enableTracing: true,
  enableRateLimiting: true,
  enableAuth: false,
  enableTenantIsolation: false,
  enableIpWhitelist: true,
  enableAudit: true,
  defaultRateLimitTier: "STANDARD",
};

export function createRouterConfig(config: Partial<RouterConfig> = {}): RouterConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
  };
}

export type InterceptorFn = (
  context: Context,
  operation: { name?: string },
  handler: () => Promise<unknown>,
) => Promise<unknown>;

export function buildInterceptors(config: RouterConfig = DEFAULT_CONFIG): InterceptorFn[] {
  const interceptors: InterceptorFn[] = [];

  interceptors.push(errorInterceptor());

  if (config.enableTracing) {
    interceptors.push(tracingInterceptor());
  }

  if (config.enableRateLimiting) {
    interceptors.push(rateLimitInterceptor(config.defaultRateLimitTier || "STANDARD"));
  }

  if (config.enableIpWhitelist) {
    interceptors.push(ipWhitelistInterceptor());
  }

  if (config.enableAudit) {
    interceptors.push(auditInterceptor());
  }

  return interceptors;
}

function errorInterceptor(): InterceptorFn {
  return async (
    context: Context,
    operation: { name?: string },
    handler: () => Promise<unknown>,
  ): Promise<unknown> => {
    try {
      return await handler();
    } catch (error) {
      const traceContext = extractTraceContext(context);
      const correlationId = traceContext?.traceId;

      if (!isStructuredError(error) && error instanceof ORPCError) {
        logger.error(
          {
            operation: operation.name,
            code: error.code,
            message: error.message,
            correlationId,
          },
          "ORPC Error",
        );
      } else if (!isStructuredError(error)) {
        logger.error(
          {
            operation: operation.name,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            correlationId,
          },
          "Unhandled error",
        );
      }

      throw error;
    }
  };
}

function tracingInterceptor(): InterceptorFn {
  return async (
    context: Context,
    operation: { name?: string },
    handler: () => Promise<unknown>,
  ): Promise<unknown> => {
    const traceContext = extractTraceContext(context);
    const startTime = Date.now();

    const spanLogger = withRequestContext(
      traceContext.traceId,
      context.session?.userId,
      context.session?.organizationId,
    );

    try {
      spanLogger.info(
        {
          operation: operation.name,
          spanId: traceContext.spanId,
          parentSpanId: traceContext.parentSpanId,
        },
        "Operation started",
      );

      const result = await handler();

      const duration = Date.now() - startTime;
      spanLogger.info(
        {
          operation: operation.name,
          duration,
          spanId: traceContext.spanId,
        },
        "Operation completed",
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      spanLogger.error(
        {
          operation: operation.name,
          duration,
          spanId: traceContext.spanId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Operation failed",
      );

      throw error;
    }
  };
}

function rateLimitInterceptor(tier: RateLimitTier): InterceptorFn {
  const rateLimit = rateLimitMiddleware(tier);

  return async (
    context: Context,
    operation: { name?: string },
    handler: () => Promise<unknown>,
  ): Promise<unknown> => {
    return rateLimit(context, operation, handler);
  };
}

function ipWhitelistInterceptor(): InterceptorFn {
  const ipWhitelist = ipWhitelistMiddleware();

  return async (
    context: Context,
    operation: { name?: string },
    handler: () => Promise<unknown>,
  ): Promise<unknown> => {
    return ipWhitelist(context, operation, handler);
  };
}

function isMutatingOperation(operationName: string | undefined): boolean {
  if (!operationName) return false;
  const mutatingPrefixes = [
    "create",
    "update",
    "delete",
    "export",
    "add",
    "remove",
    "revoke",
    "enable",
    "disable",
  ];
  return mutatingPrefixes.some((prefix) => operationName.toLowerCase().startsWith(prefix));
}

function auditInterceptor(): InterceptorFn {
  return async (
    context: Context,
    operation: { name?: string },
    handler: () => Promise<unknown>,
  ): Promise<unknown> => {
    const startTime = Date.now();
    const operationName = operation.name || "unknown";
    const isMutating = isMutatingOperation(operationName);

    try {
      const result = await handler();
      const duration = Date.now() - startTime;

      if (isMutating) {
        const auditContext = {
          userId: context.session?.userId ? parseInt(context.session.userId, 10) : undefined,
          organizationId: context.session?.organizationId
            ? parseInt(context.session.organizationId, 10)
            : undefined,
          ipAddress: context.headers?.["x-forwarded-for"] as string | undefined,
          userAgent: context.headers?.["user-agent"] as string | undefined,
          sessionId: context.headers?.["authorization"]?.slice(7),
        };

        const action = getAuditAction(operationName);
        await createAuditLog(auditContext, {
          action,
          resourceType: getResourceType(operationName),
          metadata: { operationName, duration, status: "success" },
        });
      }

      logger.info({
        operation: operationName,
        duration,
        status: "success",
        mutating: isMutating,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (isMutating) {
        const auditContext = {
          userId: context.session?.userId ? parseInt(context.session.userId, 10) : undefined,
          organizationId: context.session?.organizationId
            ? parseInt(context.session.organizationId, 10)
            : undefined,
          ipAddress: context.headers?.["x-forwarded-for"] as string | undefined,
          userAgent: context.headers?.["user-agent"] as string | undefined,
          sessionId: context.headers?.["authorization"]?.slice(7),
        };

        const action = getAuditAction(operationName);
        await createAuditLog(auditContext, {
          action,
          resourceType: getResourceType(operationName),
          metadata: {
            operationName,
            duration,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }

      logger.error(
        {
          operation: operationName,
          duration,
          status: "error",
          mutating: isMutating,
          error: error instanceof Error ? error.message : String(error),
        },
        "Operation failed",
      );

      throw error;
    }
  };
}

function getAuditAction(operationName: string): AuditAction {
  const name = operationName.toLowerCase();
  if (name.startsWith("create")) return "CREATE";
  if (name.startsWith("update")) return "UPDATE";
  if (name.startsWith("delete")) return "DELETE";
  if (name.startsWith("export")) return "EXPORT_DATA";
  if (name.startsWith("import")) return "IMPORT_DATA";
  if (name.includes("login")) return "LOGIN";
  if (name.includes("logout")) return "LOGOUT";
  if (name.includes("password")) return "PASSWORD_CHANGE";
  if (name.includes("2fa_enable")) return "2FA_ENABLE";
  if (name.includes("2fa_disable")) return "2FA_DISABLE";
  if (name.includes("api_key_create")) return "API_KEY_CREATE";
  if (name.includes("api_key_revoke")) return "API_KEY_REVOKE";
  if (name.includes("billing")) return "BILLING_CHANGE";
  if (name.includes("plan")) return "PLAN_CHANGE";
  if (name.includes("seat_add")) return "SEAT_ADD";
  if (name.includes("seat_remove")) return "SEAT_REMOVE";
  if (name.includes("domain_verify")) return "DOMAIN_VERIFY";
  return "CREATE";
}

function getResourceType(operationName: string): string {
  const name = operationName.toLowerCase();
  if (name.includes("ticket")) return "ticket";
  if (name.includes("user")) return "user";
  if (name.includes("organization")) return "organization";
  if (name.includes("team")) return "team";
  if (name.includes("report")) return "report";
  if (name.includes("billing")) return "billing";
  if (name.includes("sla")) return "sla";
  if (name.includes("csat")) return "csat";
  if (name.includes("api_key")) return "api_key";
  if (name.includes("audit")) return "audit_log";
  return "unknown";
}

export interface AuthContext {
  userId: string;
  organizationId: string;
  sessionId: string;
}

export async function resolveAuthContext(context: Context): Promise<AuthContext | null> {
  return authMiddleware(context);
}

export async function resolveOrganizationContext(context: Context): Promise<void> {
  return organizationMiddleware(context);
}

export async function requireAuth(context: Context): Promise<AuthContext> {
  const authContext = await authMiddleware(context);
  if (!authContext) {
    throw errors.unauthorized("Authentication required");
  }
  return authContext;
}

export function requireTenant(context: Context): string {
  if (!context.organizationId) {
    throw errors.tenantRequired();
  }
  return context.organizationId;
}

export { appRouter } from "@ticket-app/api/routers/index";
export { errors, ERROR_CODES } from "./utils/errors";
export type { ErrorCode, StructuredErrorMeta } from "./utils/errors";
