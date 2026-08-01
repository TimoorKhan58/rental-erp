import { describe, expect, it } from "vitest";

import {
  formatStructuredLogLine,
  redactSensitiveFields,
} from "./log-redaction";

describe("log redaction", () => {
  it("redacts password and token keys", () => {
    expect(
      redactSensitiveFields({
        password: "secret",
        accessToken: "abc",
        email: "user@example.com",
      }),
    ).toEqual({
      password: "[REDACTED]",
      accessToken: "[REDACTED]",
      email: "user@example.com",
    });
  });

  it("redacts auth reset/invite URLs embedded in values", () => {
    const line = formatStructuredLogLine({
      level: "warn",
      message: "email skipped",
      meta: {
        url: "https://erp.example.com/api/auth/reset-password/tok?token=abc&callbackURL=%2Freset-password",
      },
    });

    expect(line).toContain("[REDACTED]");
    expect(line).not.toContain("token=abc");
  });
});
