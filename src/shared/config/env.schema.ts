import { z } from "zod";

/** Node runtime mode (framework / build tooling). */
export const nodeEnvironmentSchema = z.enum([
  "development",
  "test",
  "production",
]);

/**
 * Deployment environment — selects operational defaults and production safeguards.
 * Distinct from NODE_ENV so staging can run with NODE_ENV=production.
 */
export const appEnvironmentSchema = z.enum([
  "local",
  "development",
  "staging",
  "production",
  "test",
]);

export const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

export const logFormatSchema = z.enum(["json", "pretty"]);

export const errorTrackerProviderSchema = z.enum([
  "none",
  "sentry",
  "datadog",
  "newrelic",
  "azure",
  "otlp",
]);

export const uploadStorageSchema = z.enum(["local", "s3"]);

const booleanEnvSchema = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  return Boolean(value);
}, z.boolean());

/** Like booleanEnvSchema but preserves undefined so defaults can be applied later. */
const optionalBooleanEnvSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  return Boolean(value);
}, z.boolean().optional());

const optionalTrimmedString = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().optional());

const commaSeparatedListSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}, z.array(z.string().min(1)));

const WEAK_SECRET_PATTERNS = [
  "replace-with",
  "change-me",
  "changeme",
  "docker-build-placeholder",
  "dev-only",
  "your-secret",
  "secret-key-here",
  "at-least-32-character",
] as const;

function looksLikeWeakSecret(secret: string): boolean {
  const normalized = secret.toLowerCase();
  return WEAK_SECRET_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

const envObjectSchema = z
  .object({
    // ── Runtime / deployment ───────────────────────────────────────────────
    NODE_ENV: nodeEnvironmentSchema.default("development"),
    APP_ENV: appEnvironmentSchema.optional(),

    // ── Application ────────────────────────────────────────────────────────
    APP_NAME: z.string().trim().min(1).default("Rental ERP"),
    APP_URL: z.string().trim().url().default("http://localhost:3000"),
    APP_LOCALE: z.string().trim().min(2).default("en-PK"),
    TIMEZONE: z.string().trim().min(1).default("UTC"),

    // ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
    DATABASE_POOL_IDLE_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .nonnegative()
      .default(30_000),
    DATABASE_POOL_CONNECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5_000),
    BACKUP_DIR: z.string().trim().min(1).default("./backups"),
    BACKUP_RETENTION_DAYS: z.coerce.number().int().min(0).default(14),

    // ── Authentication ─────────────────────────────────────────────────────
    BETTER_AUTH_SECRET: z
      .string()
      .trim()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z.string().trim().url().optional(),
    AUTH_SESSION_EXPIRES_IN_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24 * 7),
    AUTH_SESSION_UPDATE_AGE_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24),
    AUTH_COOKIE_CACHE_MAX_AGE_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 5),
    AUTH_MIN_PASSWORD_LENGTH: z.coerce.number().int().min(8).default(8),
    AUTH_TRUSTED_ORIGINS: commaSeparatedListSchema.default([]),
    AUTH_RATE_LIMIT_ENABLED: optionalBooleanEnvSchema,
    AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    AUTH_RATE_LIMIT_SIGN_IN_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60),
    AUTH_RATE_LIMIT_SIGN_IN_MAX: z.coerce.number().int().positive().default(10),
    AUTH_RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60),
    AUTH_RATE_LIMIT_PASSWORD_RESET_MAX: z.coerce
      .number()
      .int()
      .positive()
      .default(5),

    // ── Security ───────────────────────────────────────────────────────────
    TRUSTED_PROXIES: commaSeparatedListSchema.default([]),
    SECURE_COOKIES: booleanEnvSchema.optional(),
    ENABLE_SECURITY_HEADERS: booleanEnvSchema.optional(),
    ENABLE_HSTS: booleanEnvSchema.optional(),

    // ── Logging ────────────────────────────────────────────────────────────
    LOG_LEVEL: logLevelSchema.optional(),
    LOG_FORMAT: logFormatSchema.optional(),

    // ── Observability ──────────────────────────────────────────────────────
    ENABLE_METRICS: optionalBooleanEnvSchema,
    METRICS_BEARER_TOKEN: optionalTrimmedString,
    ERROR_TRACKER_PROVIDER: errorTrackerProviderSchema.default("none"),
    ERROR_TRACKER_DSN: optionalTrimmedString,

    // ── Storage ────────────────────────────────────────────────────────────
    UPLOAD_STORAGE: uploadStorageSchema.default("local"),
    UPLOAD_PATH: z.string().trim().min(1).default("./uploads"),
    UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),

    // ── Cache ──────────────────────────────────────────────────────────────
    CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),

    // ── Email / SMTP ───────────────────────────────────────────────────────
    SMTP_HOST: optionalTrimmedString,
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: optionalTrimmedString,
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.preprocess((value) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }

      return value;
    }, z.string().trim().email().optional()),
    SMTP_SECURE: booleanEnvSchema.default(true),

    // ── Feature flags / notifications ──────────────────────────────────────
    ENABLE_EMAIL: booleanEnvSchema.default(false),
    ENABLE_SMS: booleanEnvSchema.default(false),
  })
  .superRefine((data, context) => {
    const deployment =
      data.APP_ENV ??
      (data.NODE_ENV === "production"
        ? "production"
        : data.NODE_ENV === "test"
          ? "test"
          : "development");

    const isHardened =
      deployment === "staging" || deployment === "production";

    if (isHardened && looksLikeWeakSecret(data.BETTER_AUTH_SECRET)) {
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message:
          "BETTER_AUTH_SECRET looks like a placeholder. Use a unique secret (openssl rand -base64 32).",
      });
    }

    if (isHardened && !isHttpsUrl(data.APP_URL)) {
      context.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "APP_URL must use HTTPS in staging and production",
      });
    }

    if (
      data.BETTER_AUTH_URL &&
      isHardened &&
      !isHttpsUrl(data.BETTER_AUTH_URL)
    ) {
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message: "BETTER_AUTH_URL must use HTTPS in staging and production",
      });
    }

    if (data.UPLOAD_STORAGE === "s3") {
      context.addIssue({
        code: "custom",
        path: ["UPLOAD_STORAGE"],
        message:
          'UPLOAD_STORAGE="s3" is not implemented yet. Use "local" until the S3 adapter ships.',
      });
    }

    if (!data.ENABLE_EMAIL) {
      return;
    }

    if (!data.SMTP_HOST) {
      context.addIssue({
        code: "custom",
        path: ["SMTP_HOST"],
        message: "SMTP_HOST is required when ENABLE_EMAIL is true",
      });
    }

    if (data.SMTP_PORT === undefined) {
      context.addIssue({
        code: "custom",
        path: ["SMTP_PORT"],
        message: "SMTP_PORT is required when ENABLE_EMAIL is true",
      });
    }

    if (!data.SMTP_FROM) {
      context.addIssue({
        code: "custom",
        path: ["SMTP_FROM"],
        message: "SMTP_FROM is required when ENABLE_EMAIL is true",
      });
    }
  });

export const envSchema = envObjectSchema.transform((data) => {
  const APP_ENV =
    data.APP_ENV ??
    (data.NODE_ENV === "production"
      ? "production"
      : data.NODE_ENV === "test"
        ? "test"
        : "development");

  const isHardened = APP_ENV === "staging" || APP_ENV === "production";

  return {
    ...data,
    APP_ENV,
    LOG_LEVEL:
      data.LOG_LEVEL ??
      (isHardened || data.NODE_ENV === "production" ? "info" : "debug"),
    LOG_FORMAT:
      data.LOG_FORMAT ??
      (isHardened || data.NODE_ENV === "production" ? "json" : "pretty"),
    ENABLE_METRICS: data.ENABLE_METRICS ?? true,
    AUTH_RATE_LIMIT_ENABLED: data.AUTH_RATE_LIMIT_ENABLED ?? true,
    BETTER_AUTH_URL: data.BETTER_AUTH_URL ?? data.APP_URL,
    SECURE_COOKIES: data.SECURE_COOKIES ?? isHardened,
    ENABLE_SECURITY_HEADERS: data.ENABLE_SECURITY_HEADERS ?? isHardened,
    ENABLE_HSTS: data.ENABLE_HSTS ?? isHardened,
    SMTP_PASSWORD: data.SMTP_PASSWORD ?? undefined,
  };
});

export type Env = z.infer<typeof envSchema>;
export type NodeEnvironment = z.infer<typeof nodeEnvironmentSchema>;
export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;
export type LogLevel = z.infer<typeof logLevelSchema>;
export type LogFormat = z.infer<typeof logFormatSchema>;
export type ErrorTrackerProvider = z.infer<typeof errorTrackerProviderSchema>;
export type UploadStorage = z.infer<typeof uploadStorageSchema>;

/** Logical groups used for validation error reporting (no secret values). */
export const ENV_GROUPS = {
  runtime: ["NODE_ENV", "APP_ENV"],
  application: ["APP_NAME", "APP_URL", "APP_LOCALE", "TIMEZONE"],
  database: [
    "DATABASE_URL",
    "DATABASE_POOL_MAX",
    "DATABASE_POOL_IDLE_TIMEOUT_MS",
    "DATABASE_POOL_CONNECTION_TIMEOUT_MS",
    "BACKUP_DIR",
    "BACKUP_RETENTION_DAYS",
  ],
  auth: [
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "AUTH_SESSION_EXPIRES_IN_SECONDS",
    "AUTH_SESSION_UPDATE_AGE_SECONDS",
    "AUTH_COOKIE_CACHE_MAX_AGE_SECONDS",
    "AUTH_MIN_PASSWORD_LENGTH",
    "AUTH_TRUSTED_ORIGINS",
    "AUTH_RATE_LIMIT_ENABLED",
    "AUTH_RATE_LIMIT_WINDOW_SECONDS",
    "AUTH_RATE_LIMIT_MAX",
    "AUTH_RATE_LIMIT_SIGN_IN_WINDOW_SECONDS",
    "AUTH_RATE_LIMIT_SIGN_IN_MAX",
    "AUTH_RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS",
    "AUTH_RATE_LIMIT_PASSWORD_RESET_MAX",
  ],
  security: [
    "TRUSTED_PROXIES",
    "SECURE_COOKIES",
    "ENABLE_SECURITY_HEADERS",
    "ENABLE_HSTS",
  ],
  logging: ["LOG_LEVEL", "LOG_FORMAT"],
  observability: [
    "ENABLE_METRICS",
    "METRICS_BEARER_TOKEN",
    "ERROR_TRACKER_PROVIDER",
    "ERROR_TRACKER_DSN",
  ],
  storage: ["UPLOAD_STORAGE", "UPLOAD_PATH", "UPLOAD_MAX_FILE_SIZE_MB"],
  cache: ["CACHE_TTL_SECONDS"],
  email: [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM",
    "SMTP_SECURE",
  ],
  features: ["ENABLE_EMAIL", "ENABLE_SMS"],
} as const;
