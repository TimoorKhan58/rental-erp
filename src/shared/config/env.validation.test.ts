import { describe, expect, it } from "vitest";

import { parseEnvResult } from "./env";
import { testEnvFixture } from "./env.test-fixture";

describe("environment validation", () => {
  it("accepts a complete valid configuration", () => {
    const result = parseEnvResult({
      NODE_ENV: "development",
      APP_ENV: "local",
      APP_NAME: "Rental ERP",
      APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/rental_erp",
      BETTER_AUTH_SECRET: "local-development-secret-value-32chars!",
      LOG_LEVEL: "debug",
      UPLOAD_STORAGE: "local",
      UPLOAD_PATH: "./uploads",
      ENABLE_EMAIL: "false",
      ENABLE_SMS: "false",
      TIMEZONE: "UTC",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.APP_ENV).toBe("local");
      expect(result.data.SECURE_COOKIES).toBe(false);
      expect(result.data.ENABLE_SECURITY_HEADERS).toBe(false);
    }
  });

  it("fails fast when DATABASE_URL is missing", () => {
    const result = parseEnvResult({
      ...Object.fromEntries(
        Object.entries(testEnvFixture).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join(",") : value === undefined ? undefined : String(value),
        ]),
      ),
      DATABASE_URL: "",
      APP_ENV: "local",
      NODE_ENV: "development",
      BETTER_AUTH_SECRET: "local-development-secret-value-32chars!",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("DATABASE_URL");
      expect(result.message).not.toContain("local-development-secret");
    }
  });

  it("rejects placeholder secrets in production", () => {
    const result = parseEnvResult({
      NODE_ENV: "production",
      APP_ENV: "production",
      APP_URL: "https://erp.example.com",
      BETTER_AUTH_URL: "https://erp.example.com",
      DATABASE_URL: "postgresql://user:pass@db:5432/rental_erp",
      BETTER_AUTH_SECRET: "replace-with-at-least-32-character-secret",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("BETTER_AUTH_SECRET");
      expect(result.message).toContain("placeholder");
    }
  });

  it("requires HTTPS URLs in staging", () => {
    const result = parseEnvResult({
      NODE_ENV: "production",
      APP_ENV: "staging",
      APP_URL: "http://staging.example.com",
      DATABASE_URL: "postgresql://user:pass@db:5432/rental_erp",
      BETTER_AUTH_SECRET: "staging-unique-secret-value-32chars-ok",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("APP_URL");
      expect(result.message).toContain("HTTPS");
    }
  });

  it("requires SMTP settings when email is enabled", () => {
    const result = parseEnvResult({
      NODE_ENV: "development",
      APP_ENV: "development",
      APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/rental_erp",
      BETTER_AUTH_SECRET: "local-development-secret-value-32chars!",
      ENABLE_EMAIL: "true",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("SMTP_HOST");
      expect(result.message).toContain("SMTP_PORT");
      expect(result.message).toContain("SMTP_FROM");
    }
  });

  it("applies hardened defaults for production APP_ENV", () => {
    const result = parseEnvResult({
      NODE_ENV: "production",
      APP_ENV: "production",
      APP_URL: "https://erp.example.com",
      BETTER_AUTH_URL: "https://erp.example.com",
      DATABASE_URL: "postgresql://user:pass@db:5432/rental_erp",
      BETTER_AUTH_SECRET: "prod-unique-secret-value-32chars-ok!!",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.LOG_LEVEL).toBe("info");
      expect(result.data.LOG_FORMAT).toBe("json");
      expect(result.data.ENABLE_METRICS).toBe(true);
      expect(result.data.SECURE_COOKIES).toBe(true);
      expect(result.data.ENABLE_SECURITY_HEADERS).toBe(true);
      expect(result.data.ENABLE_HSTS).toBe(true);
    }
  });
});
