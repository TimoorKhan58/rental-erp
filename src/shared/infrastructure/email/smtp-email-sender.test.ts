import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

vi.mock("@/shared/config/email.config", () => ({
  emailConfig: {
    host: "smtp.example.com",
    port: 587,
    user: "smtp-user",
    password: "smtp-pass",
    from: "noreply@example.com",
    secure: true,
    isConfigured: true,
  },
}));

vi.mock("@/shared/config/features.config", () => ({
  featureFlags: {
    email: true,
    sms: false,
  },
}));

describe("SmtpEmailSender", () => {
  beforeEach(() => {
    sendMail.mockReset();
    createTransport.mockClear();
    sendMail.mockResolvedValue({ messageId: "msg-1" });
  });

  it("sends mail through the configured SMTP transport", async () => {
    const { SmtpEmailSender } = await import("./smtp-email-sender");
    const sender = new SmtpEmailSender();

    expect(sender.isReady()).toBe(true);

    await sender.send({
      to: "user@example.com",
      subject: "Reset",
      text: "plain",
      html: "<p>html</p>",
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: true,
        auth: {
          user: "smtp-user",
          pass: "smtp-pass",
        },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith({
      from: "noreply@example.com",
      to: "user@example.com",
      subject: "Reset",
      text: "plain",
      html: "<p>html</p>",
    });
  });
});
