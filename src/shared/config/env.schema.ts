import { z } from "zod";

export const nodeEnvironmentSchema = z.enum([
  "development",
  "test",
  "production",
]);

export const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

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

const envObjectSchema = z
  .object({
    NODE_ENV: nodeEnvironmentSchema.default("development"),
    APP_NAME: z.string().trim().min(1).default("Rental ERP"),
    APP_URL: z.string().trim().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
    BETTER_AUTH_SECRET: z
      .string()
      .trim()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z.string().trim().url().optional(),
    LOG_LEVEL: logLevelSchema.optional(),
    UPLOAD_STORAGE: uploadStorageSchema.default("local"),
    UPLOAD_PATH: z.string().trim().min(1).default("./uploads"),
    SMTP_HOST: z.string().trim().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().trim().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().trim().email().optional(),
    ENABLE_EMAIL: booleanEnvSchema.default(false),
    ENABLE_SMS: booleanEnvSchema.default(false),
    TIMEZONE: z.string().trim().min(1).default("UTC"),
  })
  .superRefine((data, context) => {
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

export const envSchema = envObjectSchema.transform((data) => ({
  ...data,
  LOG_LEVEL:
    data.LOG_LEVEL ?? (data.NODE_ENV === "production" ? "info" : "debug"),
  BETTER_AUTH_URL: data.BETTER_AUTH_URL ?? data.APP_URL,
}));

export type Env = z.infer<typeof envSchema>;
export type NodeEnvironment = z.infer<typeof nodeEnvironmentSchema>;
export type LogLevel = z.infer<typeof logLevelSchema>;
export type UploadStorage = z.infer<typeof uploadStorageSchema>;
