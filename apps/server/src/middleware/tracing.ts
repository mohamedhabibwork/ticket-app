import type { Context } from "@ticket-app/api/context";
import { logger, withRequestContext } from "../lib/logger";

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

    const version = parts[0];
    const traceId = parts[1];
    const spanId = parts[2];
    const flags = parts[3];

    if (!version || !traceId || !spanId) return null;
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
    context.headers?.[TRACEPARENT_HEADER] || context.headers?.[TRACEPARENT_HEADER.toLowerCase()];

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
    handler: () => Promise<unknown>,
  ): Promise<unknown> {
    const traceContext = extractTraceContext(context);
    const startTime = Date.now();

    context.headers = {
      ...context.headers,
      [TRACEPARENT_HEADER]: buildTraceparent(traceContext),
    };

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
        { operation: operation.name, duration, spanId: traceContext.spanId },
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

export function createSpan(_name: string, parentContext: TraceContext): TraceContext {
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
  fn: (span: TraceContext) => T,
): T {
  const span = createSpan(name, parentContext);

  logger.debug(
    { spanName: name, spanId: span.spanId, parentSpanId: span.parentSpanId, traceId: span.traceId },
    "Span started",
  );

  const result = fn(span);

  logger.debug({ spanName: name, spanId: span.spanId, traceId: span.traceId }, "Span ended");

  return result;
}
