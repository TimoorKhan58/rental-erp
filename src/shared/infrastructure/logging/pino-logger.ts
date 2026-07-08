import type { LogLevel } from "@/shared/config/env.schema";

import { createConsoleLogger } from "./console-logger";
import type { ILogger, LoggerBindings } from "./logger";

interface PinoLikeLogger {
  debug(objectOrMessage: Record<string, unknown> | string, message?: string): void;
  info(objectOrMessage: Record<string, unknown> | string, message?: string): void;
  warn(objectOrMessage: Record<string, unknown> | string, message?: string): void;
  error(objectOrMessage: Record<string, unknown> | string, message?: string): void;
  child(bindings: LoggerBindings): PinoLikeLogger;
}

type PinoFactory = (options?: { level?: string }) => PinoLikeLogger;

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (error === undefined) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      err: {
        type: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
  }

  return { err: error };
}

function tryLoadPino(): PinoFactory | null {
  try {
    // Optional runtime dependency — falls back to console logger when unavailable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional pino
    const pinoModule = require("pino") as { default: PinoFactory };
    return pinoModule.default;
  } catch {
    return null;
  }
}

class PinoLoggerAdapter implements ILogger {
  constructor(private readonly pino: PinoLikeLogger) {}

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write("debug", message, undefined, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("info", message, undefined, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("warn", message, undefined, meta);
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    this.write("error", message, error, meta);
  }

  child(bindings: LoggerBindings): ILogger {
    return new PinoLoggerAdapter(this.pino.child(bindings));
  }

  private write(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    error: unknown,
    meta?: Record<string, unknown>,
  ): void {
    const payload: Record<string, unknown> = {
      ...meta,
      ...serializeError(error),
    };

    if (Object.keys(payload).length > 0) {
      this.pino[level](payload, message);
      return;
    }

    this.pino[level](message);
  }
}

export interface PinoLoggerOptions {
  level?: LogLevel;
  bindings?: LoggerBindings;
}

export function createPinoLogger(options: PinoLoggerOptions = {}): ILogger {
  const createPino = tryLoadPino();

  if (createPino === null) {
    return createConsoleLogger({
      level: options.level,
      bindings: options.bindings,
    });
  }

  const pinoInstance = createPino({ level: options.level ?? "info" });
  const logger = options.bindings
    ? pinoInstance.child(options.bindings)
    : pinoInstance;

  return new PinoLoggerAdapter(logger);
}

export function isPinoAvailable(): boolean {
  return tryLoadPino() !== null;
}
