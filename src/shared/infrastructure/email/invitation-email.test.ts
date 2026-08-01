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
    isReady: vi.fn(() => false),
    send: vi.fn(),
  },
}));

import {
  buildInvitationEmail,
  isInvitationPasswordSetupUrl,
  InvitationEmailNotDeliveredError,
  sendInvitationEmail,
} from "./invitation-email";
import { smtpEmailSender } from "./smtp-email-sender";

describe("isInvitationPasswordSetupUrl", () => {
  it("detects invite=1 in the BA callbackURL", () => {
    expect(
      isInvitationPasswordSetupUrl(
        "https://erp.example.com/api/auth/reset-password/tok?callbackURL=%2Freset-password%3Finvite%3D1",
      ),
    ).toBe(true);
  });

  it("returns false for normal password-reset callbacks", () => {
    expect(
      isInvitationPasswordSetupUrl(
        "https://erp.example.com/api/auth/reset-password/tok?callbackURL=%2Freset-password",
      ),
    ).toBe(false);
  });
});

describe("buildInvitationEmail", () => {
  it("includes invitation branding and the setup URL", () => {
    const result = buildInvitationEmail({
      email: "user@example.com",
      name: "Ada Lovelace",
      url: "https://erp.example.com/api/auth/reset-password/tok?callbackURL=%2Freset-password%3Finvite%3D1",
    });

    expect(result.subject).toBe("You're invited to Rental ERP");
    expect(result.text).toContain("You've been invited to Rental ERP");
    expect(result.text).toContain("create your password");
    expect(result.html).toContain("Create your password");
    expect(result.html).toContain("Ada Lovelace");
  });

  it("escapes HTML special characters in the name", () => {
    const result = buildInvitationEmail({
      email: "user@example.com",
      name: '<script>alert("x")</script>',
      url: "https://erp.example.com/invite",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });
});

describe("sendInvitationEmail", () => {
  it("throws a generic delivery error when SMTP is not ready", async () => {
    await expect(
      sendInvitationEmail({
        email: "user@example.com",
        name: "Ada",
        url: "https://erp.example.com/invite",
      }),
    ).rejects.toBeInstanceOf(InvitationEmailNotDeliveredError);

    await expect(
      sendInvitationEmail({
        email: "user@example.com",
        name: "Ada",
        url: "https://erp.example.com/invite",
      }),
    ).rejects.toThrow("Invitation email could not be delivered");
  });

  it("throws a generic delivery error when SMTP send fails", async () => {
    vi.mocked(smtpEmailSender.isReady).mockReturnValueOnce(true);
    vi.mocked(smtpEmailSender.send).mockRejectedValueOnce(
      new Error("ECONNREFUSED smtp.internal:587"),
    );

    await expect(
      sendInvitationEmail({
        email: "user@example.com",
        name: "Ada",
        url: "https://erp.example.com/invite",
      }),
    ).rejects.toBeInstanceOf(InvitationEmailNotDeliveredError);
  });
});
