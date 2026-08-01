import nodemailer from "nodemailer";
import { emailConfig } from "@/shared/config/email.config";
import { featureFlags } from "@/shared/config/features.config";
import type { IEmailSender, SendEmailInput } from "./email-sender.interface";

export class EmailNotConfiguredError extends Error {
  constructor(message = "Email delivery is not configured") {
    super(message);
    this.name = "EmailNotConfiguredError";
  }
}

/**
 * SMTP email sender backed by env/`emailConfig`.
 * Requires ENABLE_EMAIL and SMTP host/port/from.
 */
export class SmtpEmailSender implements IEmailSender {
  isReady(): boolean {
    return featureFlags.email && emailConfig.isConfigured;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.isReady()) {
      throw new EmailNotConfiguredError();
    }

    const host = emailConfig.host;
    const port = emailConfig.port;
    const from = emailConfig.from;

    if (!host || port === undefined || !from) {
      throw new EmailNotConfiguredError("SMTP host, port, or from is missing");
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: emailConfig.secure,
      ...(emailConfig.user
        ? {
            auth: {
              user: emailConfig.user,
              pass: emailConfig.password,
            },
          }
        : {}),
    });

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }
}

export const smtpEmailSender = new SmtpEmailSender();
