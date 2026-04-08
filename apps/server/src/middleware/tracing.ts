import type { Context } from "@ticket-app/api/context";
import { logger } from "../lib/logger";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

export interface TracingHeaders {
  traceparent: string;
  tracestate?: string;
}

const TRACEPARENT_HEADER = "traceparent";
const TRACING_VERSION = "00";

function generateTraceId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
}

function generateSpanId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export { generateTraceId, generateSpanId };

export function parseTraceparent(value: string): TraceContext | null {
  try {
    const parts = value.split("-");
    if (parts.length < 3) return null;

    const [version, traceId, spanId, flags] = parts;

    if (version !== TRACING_VERSION) return null;
    if (traceId.length !== 32) return null;
    if (spanId.length !== 16) return null;

    return {
      traceId,
      spanId,
      sampled: flags === "01",
    };
  } catch {
    return null;
  }
}

export function buildTraceparent(context: TraceContext): string {
  const flags = context.sampled ? "01" : "00";
  return `${TRACING_VERSION}-${context.traceId}-${context.spanId}-${flags}`;
}

export function getTracingHeaders(context: TraceContext): TracingHeaders {
  const headers: TracingHeaders = {
    traceparent: buildTraceparent(context),
  };

  if (context.sampled) {
    headers.tracestate = "sampled=true";
  }

  return headers;
}

export function extractTraceContext(context: Context): TraceContext {
  const incomingTraceparent =
    context.headers?.[TRACEPARENT_HEADER] ||
    context.headers?.[TRACEPARENT_HEADER.toLowerCase()];

  if (incomingTraceparent) {
    const parsed = parseTraceparent(incomingTraceparent);
    if (parsed) {
      return {
        ...parsed,
        parentSpanId: parsed.spanId,
        spanId: generateSpanId(),
      };
    }
  }

  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    sampled: true,
  };
}

export function tracingMiddleware() {
  return async function tracingHandler(
    context: Context,
    operation: { name?: string },
    handler: () => Promise<unknown>
  ): Promise<unknown> {
    const traceContext = extractTraceContext(context);
    const startTime = Date.now();

    context.headers = {
      ...context.headers,
      [TRACEPARENT_HEADER]: buildTraceparent(traceContext),
    };

    const spanLogger = logger.withRequestContext(
      traceContext.traceId,
      context.session?.userId,
      context.session?.organizationId
    );

    try {
      spanLogger.info("Operation started", {
        operation: operation.name,
        spanId: traceContext.spanId,
        parentSpanId: traceContext.parentSpanId,
      });

      const result = await handler();

      const duration = Date.now() - startTime;
      spanLogger.info("Operation completed", {
        operation: operation.name,
        duration,
        spanId: traceContext.spanId,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      spanLogger.error("Operation failed", {
        operation: operation.name,
        duration,
        spanId: traceContext.spanId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };
}

export function createSpan(name: string, parentContext: TraceContext): TraceContext {
  return {
    traceId: parentContext.traceId,
    spanId: generateSpanId(),
    parentSpanId: parentContext.spanId,
    sampled: parentContext.sampled,
  };
}

export function withSpan<T>(
  name: string,
  parentContext: TraceContext,
  fn: (span: TraceContext) => T
): T {
  const span = createSpan(name, parentContext);
  const headers = getTracingHeaders(span);

  logger.debug("Span started", {
    spanName: name,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    traceId: span.traceId,
  });

  const result = fn(span);

  logger.debug("Span ended", {
    spanName: name,
    spanId: span.spanId,
    traceId: span.traceId,
  });

  return result;
}
