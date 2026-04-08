import { logger as honoLogger } from "hono/logger";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  requestId?: string;
  userId?: string;
  organizationId?: string;
  duration?: number;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class StructuredLogger implements Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = "info") {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  protected log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }

  withRequestContext(requestId: string, userId?: string, organizationId?: string): Logger {
    return new RequestContextLogger(this, { requestId, userId, organizationId });
  }

  withDuration(duration: number): Logger {
    return new DurationLogger(this, duration);
  }
}

class RequestContextLogger implements Logger {
  constructor(
    private parent: StructuredLogger,
    private context: { requestId: string; userId?: string; organizationId?: string }
  ) {}

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    this.parent.log(level, message, {
      ...context,
      requestId: this.context.requestId,
      userId: this.context.userId,
      organizationId: this.context.organizationId,
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }
}

class DurationLogger implements Logger {
  constructor(private parent: StructuredLogger, private duration: number) {}

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    this.parent.log(level, message, { ...context, duration: this.duration });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }
}

export const logger = new StructuredLogger(
  (process.env.LOG_LEVEL as LogLevel) || ("info" as LogLevel)
);

export const requestLogger = honoLogger((message, ...rest) => {
  const requestInfo = (rest[0] || {}) as { method?: string; path?: string; status?: number };
  logger.info(message, {
    method: requestInfo.method,
    path: requestInfo.path,
    status: requestInfo.status,
  });
});

export function createChildLogger(context: Record<string, unknown>): Logger {
  return {
    debug: (msg: string, ctx?: Record<string, unknown>) => logger.debug(msg, { ...context, ...ctx }),
    info: (msg: string, ctx?: Record<string, unknown>) => logger.info(msg, { ...context, ...ctx }),
    warn: (msg: string, ctx?: Record<string, unknown>) => logger.warn(msg, { ...context, ...ctx }),
    error: (msg: string, ctx?: Record<string, unknown>) => logger.error(msg, { ...context, ...ctx }),
  };
}
