import type { ServiceLogLevel } from "./config.js";

export interface ServiceLogger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

const LOG_LEVEL_PRIORITY: Record<ServiceLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createServiceLogger(level: ServiceLogLevel): ServiceLogger {
  const minimum = LOG_LEVEL_PRIORITY[level];

  const emit = (entryLevel: ServiceLogLevel, message: string, metadata?: Record<string, unknown>) => {
    if (LOG_LEVEL_PRIORITY[entryLevel] < minimum) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level: entryLevel,
      message,
      ...(metadata ? { metadata } : {}),
    };
    const line = JSON.stringify(payload);

    if (entryLevel === "warn") {
      console.warn(line);
      return;
    }
    if (entryLevel === "error") {
      console.error(line);
      return;
    }
    console.log(line);
  };

  return {
    debug: (message, metadata) => emit("debug", message, metadata),
    info: (message, metadata) => emit("info", message, metadata),
    warn: (message, metadata) => emit("warn", message, metadata),
    error: (message, metadata) => emit("error", message, metadata),
  };
}
