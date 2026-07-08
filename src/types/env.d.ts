declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: "development" | "production" | "test";
    APP_NAME?: string;
    APP_URL?: string;
    DATABASE_URL?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error";
    UPLOAD_STORAGE?: "local" | "s3";
    UPLOAD_PATH?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASSWORD?: string;
    SMTP_FROM?: string;
    ENABLE_EMAIL?: string;
    ENABLE_SMS?: string;
    TIMEZONE?: string;
    /** @deprecated Use APP_URL — read only inside src/shared/config */
    NEXT_PUBLIC_APP_URL?: string;
  }
}
