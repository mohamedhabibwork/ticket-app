import { ORPCError } from "@orpc/server";

export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TENANT_REQUIRED: "TENANT_REQUIRED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface StructuredErrorMeta {
  code: ErrorCode;
  statusCode: number;
  message: string;
  details?: Record<string, unknown>;
  correlationId?: string;
}

export class StructuredError extends ORPCError<ErrorCode, { message: string; code: ErrorCode }> {
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly correlationId?: string;
  public readonly code: ErrorCode;
  public readonly message: string;

  constructor(meta: StructuredErrorMeta) {
    super(meta.code, {
      data: {
        message: meta.message,
        code: meta.code,
      },
    });
    this.name = "StructuredError";
    this.code = meta.code;
    this.message = meta.message;
    this.statusCode = meta.statusCode;
    this.details = meta.details;
    this.correlationId = meta.correlationId;
  }

  toJSON(): {
    defined: true;
    code: ErrorCode;
    status: number;
    message: string;
    data: { message: string; code: ErrorCode };
  } {
    return {
      defined: true,
      code: this.code,
      status: this.statusCode,
      message: this.message,
      data: {
        message: this.message,
        code: this.code,
      },
    };
  }
}

export function createError(
  code: ErrorCode,
  message: string,
  options?: { statusCode?: number; details?: Record<string, unknown>; correlationId?: string },
): StructuredError {
  const statusCodeMap: Record<ErrorCode, number> = {
    [ERROR_CODES.UNAUTHORIZED]: 401,
    [ERROR_CODES.FORBIDDEN]: 403,
    [ERROR_CODES.NOT_FOUND]: 404,
    [ERROR_CODES.BAD_REQUEST]: 400,
    [ERROR_CODES.CONFLICT]: 409,
    [ERROR_CODES.UNPROCESSABLE_ENTITY]: 422,
    [ERROR_CODES.TOO_MANY_REQUESTS]: 429,
    [ERROR_CODES.INTERNAL_SERVER_ERROR]: 500,
    [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
    [ERROR_CODES.VALIDATION_ERROR]: 422,
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
    [ERROR_CODES.TENANT_REQUIRED]: 400,
    [ERROR_CODES.SESSION_EXPIRED]: 401,
    [ERROR_CODES.INVALID_CREDENTIALS]: 401,
    [ERROR_CODES.RESOURCE_CONFLICT]: 409,
  };

  return new StructuredError({
    code,
    statusCode: options?.statusCode ?? statusCodeMap[code],
    message,
    details: options?.details,
    correlationId: options?.correlationId,
  });
}

export const errors = {
  unauthorized: (message = "Authentication required", correlationId?: string) =>
    createError(ERROR_CODES.UNAUTHORIZED, message, { correlationId }),

  forbidden: (message = "Access denied", correlationId?: string) =>
    createError(ERROR_CODES.FORBIDDEN, message, { correlationId }),

  notFound: (resource = "Resource", correlationId?: string) =>
    createError(ERROR_CODES.NOT_FOUND, `${resource} not found`, { correlationId }),

  badRequest: (message = "Invalid request", correlationId?: string) =>
    createError(ERROR_CODES.BAD_REQUEST, message, { correlationId }),

  conflict: (message = "Resource conflict", correlationId?: string) =>
    createError(ERROR_CODES.CONFLICT, message, { correlationId }),

  validation: (details: Record<string, unknown>, correlationId?: string) =>
    createError(ERROR_CODES.VALIDATION_ERROR, "Validation failed", {
      details,
      correlationId,
    }),

  rateLimit: (retryAfter?: Date, correlationId?: string) =>
    createError(ERROR_CODES.RATE_LIMIT_EXCEEDED, "Rate limit exceeded", {
      details: retryAfter ? { retryAfter: retryAfter.toISOString() } : undefined,
      correlationId,
    }),

  tenantRequired: (correlationId?: string) =>
    createError(ERROR_CODES.TENANT_REQUIRED, "Organization context is required", { correlationId }),

  sessionExpired: (correlationId?: string) =>
    createError(ERROR_CODES.SESSION_EXPIRED, "Session expired", { correlationId }),

  invalidCredentials: (correlationId?: string) =>
    createError(ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials", { correlationId }),

  serviceUnavailable: (service = "Service", correlationId?: string) =>
    createError(ERROR_CODES.SERVICE_UNAVAILABLE, `${service} is unavailable`, { correlationId }),

  internal: (message = "Internal server error", correlationId?: string) =>
    createError(ERROR_CODES.INTERNAL_SERVER_ERROR, message, { correlationId }),
};

export function isORPCError(
  error: unknown,
): error is ORPCError<ErrorCode, { message: string; code: ErrorCode }> {
  return error instanceof ORPCError;
}

export function isStructuredError(error: unknown): error is StructuredError {
  return error instanceof StructuredError;
}

export function getErrorResponse(error: unknown) {
  if (isStructuredError(error)) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: error.message || "An unexpected error occurred",
      },
    };
  }

  return {
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
    },
  };
}
