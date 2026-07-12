import { env } from "./env";

export const notificationsConfig = {
  emailEnabled: env.ENABLE_EMAIL,
  smsEnabled: env.ENABLE_SMS,
} as const;

export type NotificationsConfig = typeof notificationsConfig;
