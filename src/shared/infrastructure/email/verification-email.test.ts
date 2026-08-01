import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/config/app.config", () => ({
  appConfig: {
    name: "Rental ERP",
    isHardened: false,
  },
}));

vi.mock("@/shared/infrastructure/logging", () => ({
  createAppLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  }),
}));

vi.mock("./smtp-email-sender", () => ({
  EmailNotConfiguredError: class EmailNotConfiguredError extends Error {
    constructor(message?: string) {
      super(message);
      this.name = "EmailNotConfiguredError";
    }
  },
  smtpEmailSender: {
    isReady: () => false,
    send: vi.fn(),
  },
}));

import { buildVerificationEmail, withVerificationResultCallback } from "./verification-email";

describe("withVerificationResultCallback", () => {
  it("sets callbackURL to the public verify-email success result", () => {
    const result = withVerificationResultCallback(
      "https://erp.example.com/api/auth/verify-email?token=abc&callbackURL=%2F",
    );

    expect(result).toContain(
      `callbackURL=${encodeURIComponent("/verify-email?status=success")}`,
    );
    expect(result).toContain("token=abc");
  });
});

describe("buildVerificationEmail", () => {
  it("includes the verification URL and app branding in text and html", () => {
    const result = buildVerificationEmail({
      email: "user@example.com",
      name: "Ada Lovelace",
      url: "https://erp.example.com/api/auth/verify-email?token=abc&callbackURL=%2F",
    });

    expect(result.subject).toBe("Verify your Rental ERP email");
    expect(result.text).toContain("Ada Lovelace");
    expect(result.text).toContain(
      "https://erp.example.com/api/auth/verify-email?token=abc&callbackURL=%2F",
    );
    expect(result.html).toContain("Ada Lovelace");
    expect(result.html).toContain(
      'href="https://erp.example.com/api/auth/verify-email?token=abc&amp;callbackURL=%2F"',
    );
  });

  it("escapes HTML special characters in the name", () => {
    const result = buildVerificationEmail({
      email: "user@example.com",
      name: '<script>alert("x")</script>',
      url: "https://erp.example.com/verify",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("falls back to a generic greeting when name is blank", () => {
    const result = buildVerificationEmail({
      email: "user@example.com",
      name: "   ",
      url: "https://erp.example.com/verify",
    });

    expect(result.text).toContain("Hi there,");
    expect(result.html).toContain("Hi there,");
  });
});
