import { type ZodError } from "zod";

import {
  ENV_GROUPS,
  envSchema,
  type Env,
} from "./env.schema";

export type { Env };

const SECRET_ENV_KEYS = new Set([
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "SMTP_PASSWORD",
]);

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      const group = resolveEnvGroup(path);
      const groupLabel = group ? `[${group}] ` : "";
      return `  • ${groupLabel}${path}: ${issue.message}`;
    })
    .join("\n");
}

function resolveEnvGroup(path: string): string | undefined {
  for (const [group, keys] of Object.entries(ENV_GROUPS)) {
    if ((keys as readonly string[]).includes(path)) {
      return group;
    }
  }

  return undefined;
}

export function readProcessEnv(): Record<string, string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    APP_ENV: process.env.APP_ENV,
    APP_NAME: process.env.APP_NAME,
    APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    APP_LOCALE: process.env.APP_LOCALE,
    TIMEZONE: process.env.TIMEZONE,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
    DATABASE_POOL_IDLE_TIMEOUT_MS: process.env.DATABASE_POOL_IDLE_TIMEOUT_MS,
    DATABASE_POOL_CONNECTION_TIMEOUT_MS:
      process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
    BACKUP_DIR: process.env.BACKUP_DIR,
    BACKUP_RETENTION_DAYS: process.env.BACKUP_RETENTION_DAYS,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTH_SESSION_EXPIRES_IN_SECONDS:
      process.env.AUTH_SESSION_EXPIRES_IN_SECONDS,
    AUTH_SESSION_UPDATE_AGE_SECONDS: process.env.AUTH_SESSION_UPDATE_AGE_SECONDS,
    AUTH_COOKIE_CACHE_MAX_AGE_SECONDS:
      process.env.AUTH_COOKIE_CACHE_MAX_AGE_SECONDS,
    AUTH_MIN_PASSWORD_LENGTH: process.env.AUTH_MIN_PASSWORD_LENGTH,
    AUTH_TRUSTED_ORIGINS: process.env.AUTH_TRUSTED_ORIGINS,
    AUTH_RATE_LIMIT_ENABLED: process.env.AUTH_RATE_LIMIT_ENABLED,
    AUTH_RATE_LIMIT_WINDOW_SECONDS: process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX,
    AUTH_RATE_LIMIT_SIGN_IN_WINDOW_SECONDS:
      process.env.AUTH_RATE_LIMIT_SIGN_IN_WINDOW_SECONDS,
    AUTH_RATE_LIMIT_SIGN_IN_MAX: process.env.AUTH_RATE_LIMIT_SIGN_IN_MAX,
    AUTH_RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS:
      process.env.AUTH_RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS,
    AUTH_RATE_LIMIT_PASSWORD_RESET_MAX:
      process.env.AUTH_RATE_LIMIT_PASSWORD_RESET_MAX,
    TRUSTED_PROXIES: process.env.TRUSTED_PROXIES,
    SECURE_COOKIES: process.env.SECURE_COOKIES,
    ENABLE_SECURITY_HEADERS: process.env.ENABLE_SECURITY_HEADERS,
    ENABLE_HSTS: process.env.ENABLE_HSTS,
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_FORMAT: process.env.LOG_FORMAT,
    ENABLE_METRICS: process.env.ENABLE_METRICS,
    METRICS_BEARER_TOKEN: process.env.METRICS_BEARER_TOKEN,
    ERROR_TRACKER_PROVIDER: process.env.ERROR_TRACKER_PROVIDER,
    ERROR_TRACKER_DSN: process.env.ERROR_TRACKER_DSN,
    UPLOAD_STORAGE: process.env.UPLOAD_STORAGE,
    UPLOAD_PATH: process.env.UPLOAD_PATH,
    UPLOAD_MAX_FILE_SIZE_MB: process.env.UPLOAD_MAX_FILE_SIZE_MB,
    CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
    SMTP_SECURE: process.env.SMTP_SECURE,
    ENABLE_EMAIL: process.env.ENABLE_EMAIL,
    ENABLE_SMS: process.env.ENABLE_SMS,
  };
}

export type ParseEnvResult =
  | { success: true; data: Env }
  | { success: false; error: ZodError; message: string };

/**
 * Validates environment input without exiting the process.
 * Safe for scripts and tests — never includes secret values in messages.
 */
export function parseEnvResult(
  raw: Record<string, string | undefined> = readProcessEnv(),
): ParseEnvResult {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      message: [
        "Invalid environment configuration:",
        formatZodError(result.error),
        "",
        "Copy .env.example to .env (or set process environment variables)",
        "and provide valid non-secret + secret values before starting.",
        "See docs/production/ENVIRONMENT_VARIABLES.md",
      ].join("\n"),
    };
  }

  return { success: true, data: result.data };
}

function parseEnvOrExit(): Env {
  const result = parseEnvResult();

  if (!result.success) {
    console.error(result.message);
    process.exit(1);
  }

  return result.data;
}

/**
 * Returns a redacted snapshot suitable for diagnostics (no secret material).
 */
export function getPublicEnvSnapshot(values: Env = env): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    if (SECRET_ENV_KEYS.has(key)) {
      snapshot[key] = value ? "[set]" : "[unset]";
      continue;
    }

    snapshot[key] = value;
  }

  return snapshot;
}

export const env: Env = parseEnvOrExit();
