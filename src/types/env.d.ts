declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: "development" | "production" | "test";
    APP_ENV?: "local" | "development" | "staging" | "production" | "test";
    APP_NAME?: string;
    APP_URL?: string;
    APP_LOCALE?: string;
    DATABASE_URL?: string;
    DATABASE_POOL_MAX?: string;
    DATABASE_POOL_IDLE_TIMEOUT_MS?: string;
    DATABASE_POOL_CONNECTION_TIMEOUT_MS?: string;
    BACKUP_DIR?: string;
    BACKUP_RETENTION_DAYS?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    AUTH_SESSION_EXPIRES_IN_SECONDS?: string;
    AUTH_SESSION_UPDATE_AGE_SECONDS?: string;
    AUTH_COOKIE_CACHE_MAX_AGE_SECONDS?: string;
    AUTH_MIN_PASSWORD_LENGTH?: string;
    AUTH_TRUSTED_ORIGINS?: string;
    AUTH_RATE_LIMIT_ENABLED?: string;
    AUTH_RATE_LIMIT_WINDOW_SECONDS?: string;
    AUTH_RATE_LIMIT_MAX?: string;
    AUTH_RATE_LIMIT_SIGN_IN_WINDOW_SECONDS?: string;
    AUTH_RATE_LIMIT_SIGN_IN_MAX?: string;
    AUTH_RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS?: string;
    AUTH_RATE_LIMIT_PASSWORD_RESET_MAX?: string;
    TRUSTED_PROXIES?: string;
    SECURE_COOKIES?: string;
    ENABLE_SECURITY_HEADERS?: string;
    ENABLE_HSTS?: string;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error";
    LOG_FORMAT?: "json" | "pretty";
    ENABLE_METRICS?: string;
    METRICS_BEARER_TOKEN?: string;
    ERROR_TRACKER_PROVIDER?:
      | "none"
      | "sentry"
      | "datadog"
      | "newrelic"
      | "azure"
      | "otlp";
    ERROR_TRACKER_DSN?: string;
    UPLOAD_STORAGE?: "local" | "s3";
    UPLOAD_PATH?: string;
    UPLOAD_MAX_FILE_SIZE_MB?: string;
    CACHE_TTL_SECONDS?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASSWORD?: string;
    SMTP_FROM?: string;
    SMTP_SECURE?: string;
    ENABLE_EMAIL?: string;
    ENABLE_SMS?: string;
    TIMEZONE?: string;
    /** @deprecated Use APP_URL — read only inside src/shared/config */
    NEXT_PUBLIC_APP_URL?: string;
  }
}
