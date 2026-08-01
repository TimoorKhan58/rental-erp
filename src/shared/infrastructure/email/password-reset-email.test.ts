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

import { buildPasswordResetEmail } from "./password-reset-email";

describe("buildPasswordResetEmail", () => {
  it("includes the reset URL and app branding in text and html", () => {
    const result = buildPasswordResetEmail({
      email: "user@example.com",
      name: "Ada Lovelace",
      url: "https://erp.example.com/api/auth/reset-password/tok123?callbackURL=%2Freset-password",
    });

    expect(result.subject).toBe("Reset your Rental ERP password");
    expect(result.text).toContain("Ada Lovelace");
    expect(result.text).toContain(
      "https://erp.example.com/api/auth/reset-password/tok123?callbackURL=%2Freset-password",
    );
    expect(result.html).toContain("Ada Lovelace");
    expect(result.html).toContain(
      'href="https://erp.example.com/api/auth/reset-password/tok123?callbackURL=%2Freset-password"',
    );
  });

  it("escapes HTML special characters in the name", () => {
    const result = buildPasswordResetEmail({
      email: "user@example.com",
      name: '<script>alert("x")</script>',
      url: "https://erp.example.com/reset",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("falls back to a generic greeting when name is blank", () => {
    const result = buildPasswordResetEmail({
      email: "user@example.com",
      name: "   ",
      url: "https://erp.example.com/reset",
    });

    expect(result.text).toContain("Hi there,");
    expect(result.html).toContain("Hi there,");
  });
});
