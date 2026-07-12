import type { LogLevel } from "@/shared/config/env.schema";
import { loggingConfig } from "@/shared/config/logging.config";

import { createConsoleLogger } from "./console-logger";
import type { ILogger, LoggerBindings } from "./logger";
import { createPinoLogger, isPinoAvailable } from "./pino-logger";

export interface CreateAppLoggerOptions {
  level?: LogLevel;
  format?: "json" | "pretty";
  bindings?: LoggerBindings;
  /**
   * Prefer optional pino when installed and format is json.
   * Defaults to true in production-like deployments.
   */
  preferPino?: boolean;
}

/**
 * Application logger factory — vendor-neutral structured logging.
 * Uses JSON by default in staging/production; pretty console in local/dev.
 */
export function createAppLogger(
  options: CreateAppLoggerOptions = {},
): ILogger {
  const level = options.level ?? loggingConfig.level;
  const format = options.format ?? loggingConfig.format;
  const preferPino = options.preferPino ?? loggingConfig.preferPino;

  if (preferPino && format === "json" && isPinoAvailable()) {
    return createPinoLogger({
      level,
      bindings: options.bindings,
    });
  }

  return createConsoleLogger({
    level,
    format,
    bindings: options.bindings,
  });
}
