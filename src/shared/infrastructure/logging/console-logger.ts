import type { LogLevel } from "@/shared/config/env.schema";

import type { ILogger, LoggerBindings } from "./logger";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface ConsoleLoggerOptions {
  level?: LogLevel;
  bindings?: LoggerBindings;
}

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (error === undefined) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  return { errorValue: error };
}

function formatMetadata(
  bindings: LoggerBindings,
  meta?: Record<string, unknown>,
  error?: unknown,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...bindings, ...meta };
  const serializedError = serializeError(error);

  if (serializedError !== undefined) {
    Object.assign(payload, serializedError);
  }

  return payload;
}

function formatLogBlock(
  level: string,
  message: string,
  metadata: Record<string, unknown>,
): string {
  const timestamp = new Date().toISOString();
  const metadataBlock =
    Object.keys(metadata).length > 0
      ? `\n\n${JSON.stringify(metadata, null, 2)}`
      : "";

  return `[${timestamp}]\n${level}\n${message}${metadataBlock}`;
}

class ConsoleLogger implements ILogger {
  private readonly bindings: LoggerBindings;
  private readonly minLevel: LogLevel;

  constructor(options: ConsoleLoggerOptions = {}) {
    this.bindings = options.bindings ?? {};
    this.minLevel = options.level ?? "info";
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write("debug", "DEBUG", message, undefined, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("info", "INFO", message, undefined, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("warn", "WARN", message, undefined, meta);
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    this.write("error", "ERROR", message, error, meta);
  }

  child(bindings: LoggerBindings): ILogger {
    return new ConsoleLogger({
      level: this.minLevel,
      bindings: {
        ...this.bindings,
        ...bindings,
      },
    });
  }

  private write(
    level: LogLevel,
    label: string,
    message: string,
    error: unknown,
    meta?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const metadata = formatMetadata(this.bindings, meta, error);
    const output = formatLogBlock(label, message, metadata);

    switch (level) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }
}

export function createConsoleLogger(
  options: ConsoleLoggerOptions = {},
): ILogger {
  return new ConsoleLogger(options);
}
