import { env } from "./env";

export const loggingConfig = {
  level: env.LOG_LEVEL,
  format: env.LOG_FORMAT,
  /** Prefer optional pino when installed and format is json. */
  preferPino: env.APP_ENV === "staging" || env.APP_ENV === "production",
} as const;

export type LoggingConfig = typeof loggingConfig;
