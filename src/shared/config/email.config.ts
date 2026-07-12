import { env } from "./env";

export const emailConfig = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  /** Present only when configured — never log this value. */
  password: env.SMTP_PASSWORD,
  from: env.SMTP_FROM,
  secure: env.SMTP_SECURE,
  isConfigured: Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM),
} as const;

export type EmailConfig = typeof emailConfig;
