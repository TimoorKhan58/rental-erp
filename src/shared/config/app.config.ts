import { env } from "./env";
import { cacheConfig } from "./cache.config";
import { loggingConfig } from "./logging.config";
import { notificationsConfig } from "./notifications.config";
import { storageConfig } from "./storage.config";

export const appConfig = {
  name: env.APP_NAME,
  /** Node runtime: development | test | production */
  environment: env.NODE_ENV,
  /** Deployment target: local | development | staging | production | test */
  deploymentEnvironment: env.APP_ENV,
  url: env.APP_URL,
  locale: env.APP_LOCALE,
  timezone: env.TIMEZONE,
  isDevelopment: env.NODE_ENV === "development",
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  isLocal: env.APP_ENV === "local",
  isStaging: env.APP_ENV === "staging",
  isHardened:
    env.APP_ENV === "staging" || env.APP_ENV === "production",
  /** @deprecated Prefer `loggingConfig` — kept for existing call sites. */
  logging: {
    level: loggingConfig.level,
    format: loggingConfig.format,
  },
  /** @deprecated Prefer `storageConfig` — kept for existing call sites. */
  uploads: {
    storage: storageConfig.provider,
    path: storageConfig.path,
    maxFileSizeMb: storageConfig.maxFileSizeMb,
    maxFileSizeBytes: storageConfig.maxFileSizeBytes,
  },
  /** @deprecated Prefer `notificationsConfig` — kept for existing call sites. */
  notifications: {
    emailEnabled: notificationsConfig.emailEnabled,
    smsEnabled: notificationsConfig.smsEnabled,
  },
  cache: {
    ttlSeconds: cacheConfig.ttlSeconds,
  },
} as const;

export type AppConfig = typeof appConfig;
