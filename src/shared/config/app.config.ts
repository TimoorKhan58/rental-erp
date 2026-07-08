import { env } from "./env";

export const appConfig = {
  name: env.APP_NAME,
  environment: env.NODE_ENV,
  url: env.APP_URL,
  timezone: env.TIMEZONE,
  isDevelopment: env.NODE_ENV === "development",
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  logging: {
    level: env.LOG_LEVEL,
  },
  uploads: {
    storage: env.UPLOAD_STORAGE,
    path: env.UPLOAD_PATH,
  },
  notifications: {
    emailEnabled: env.ENABLE_EMAIL,
    smsEnabled: env.ENABLE_SMS,
  },
} as const;

export type AppConfig = typeof appConfig;
