import { type ZodError } from "zod";

import { envSchema, type Env } from "./env.schema";

export type { Env };

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `  • ${path}: ${issue.message}`;
    })
    .join("\n");
}

function readProcessEnv(): Record<string, string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    APP_NAME: process.env.APP_NAME,
    APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    UPLOAD_STORAGE: process.env.UPLOAD_STORAGE,
    UPLOAD_PATH: process.env.UPLOAD_PATH,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
    ENABLE_EMAIL: process.env.ENABLE_EMAIL,
    ENABLE_SMS: process.env.ENABLE_SMS,
    TIMEZONE: process.env.TIMEZONE,
  };
}

function parseEnv(): Env {
  const result = envSchema.safeParse(readProcessEnv());

  if (!result.success) {
    console.error("Invalid environment configuration:\n");
    console.error(formatZodError(result.error));
    console.error(
      "\nCopy .env.example to .env and provide valid values before starting the application.",
    );
    process.exit(1);
  }

  return result.data;
}

export const env: Env = parseEnv();
