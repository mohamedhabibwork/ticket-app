import { Hono } from "hono";
import type { MiddlewareHandler } from "hono/types";
import pino from "pino";
import { env } from "@ticket-app/env/server";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const level = (env.LOG_LEVEL as LogLevel) || "info";

export const logger = pino({
  level,
  base: {
    env: env.NODE_ENV || "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
});

export function withRequestContext(requestId: string, userId?: string, organizationId?: string) {
  return logger.child({ requestId, userId, organizationId });
}

export function withDuration(duration: number) {
  return logger.child({ duration });
}

export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

export function createRequestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    const requestId = c.get("requestId") || crypto.randomUUID();

    c.set("requestId", requestId);

    let status = 0;

    try {
      await next();
      status = c.res.status;
    } catch (err) {
      logger.error(
        {
          requestId,
          method: c.req.method,
          path: c.req.path,
          err,
        },
        "Request error",
      );
      throw err;
    } finally {
      const duration = Date.now() - start;
      const logLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

      logger[logLevel](
        {
          requestId,
          method: c.req.method,
          path: c.req.path,
          status,
          duration,
          userId: c.get("userId"),
          organizationId: c.get("organizationId"),
        },
        `${c.req.method} ${c.req.path} ${status} - ${duration}ms`,
      );
    }
  };
}

export const requestLogger = createRequestLogger();

export interface SocketLogContext {
  socketId?: string;
  userId?: number;
  organizationId?: number;
  room?: string;
  event?: string;
}

export function createSocketLogger() {
  const socketLog = logger.child({ type: "socket" });

  return {
    connection: (socketId: string, userId: number, organizationId: number) => {
      socketLog.info({ socketId, userId, organizationId, event: "connection" }, "Socket connected");
    },
    disconnection: (socketId: string, userId: number, reason: string) => {
      socketLog.info({ socketId, userId, reason, event: "disconnection" }, "Socket disconnected");
    },
    roomJoin: (socketId: string, userId: number, room: string) => {
      socketLog.debug({ socketId, userId, room, event: "room_join" }, "Socket joined room");
    },
    roomLeave: (socketId: string, userId: number, room: string) => {
      socketLog.debug({ socketId, userId, room, event: "room_leave" }, "Socket left room");
    },
    eventEmit: (socketId: string, userId: number, event: string, room: string) => {
      socketLog.debug(
        { socketId, userId, eventName: event, room, event: "emit" },
        "Socket event emitted",
      );
    },
    eventReceive: (socketId: string, userId: number, event: string) => {
      socketLog.debug(
        { socketId, userId, eventName: event, event: "receive" },
        "Socket event received",
      );
    },
    error: (socketId: string, userId: number, error: string) => {
      socketLog.error({ socketId, userId, error, event: "error" }, "Socket error");
    },
  };
}

export const socketLogger = createSocketLogger();

export function setupLoggerMiddleware(app: Hono) {
  app.use(requestLogger);
}
