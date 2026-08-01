import { appConfig } from "@/shared/config/app.config";
import { createAppLogger } from "@/shared/infrastructure/logging";
import {
  EmailNotConfiguredError,
  smtpEmailSender,
} from "./smtp-email-sender";

export type PasswordResetEmailInput = {
  readonly email: string;
  readonly name: string;
  readonly url: string;
};

function buildPasswordResetEmail(input: PasswordResetEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Reset your ${appConfig.name} password`;
  const greeting = input.name.trim().length > 0 ? input.name.trim() : "there";

  const text = [
    `Hi ${greeting},`,
    "",
    `We received a request to reset your ${appConfig.name} password.`,
    "Open the link below to choose a new password. If you did not request this, you can ignore this email.",
    "",
    input.url,
    "",
    "This link expires after a short time for security.",
  ].join("\n");

  const html = `
    <p>Hi ${escapeHtml(greeting)},</p>
    <p>We received a request to reset your <strong>${escapeHtml(appConfig.name)}</strong> password.</p>
    <p><a href="${escapeHtml(input.url)}">Reset your password</a></p>
    <p>If you did not request this, you can ignore this email. This link expires after a short time for security.</p>
  `.trim();

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Deliver Better Auth's password-reset email via SMTP.
 * When email is disabled locally, logs the reset URL so developers can continue.
 * Does not throw when email is disabled (avoids user enumeration via 500s).
 */
export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput,
): Promise<void> {
  const logger = createAppLogger({ bindings: { component: "password-reset-email" } });
  const payload = buildPasswordResetEmail(input);

  if (!smtpEmailSender.isReady()) {
    if (appConfig.isHardened) {
      logger.error(
        "Password reset email skipped: ENABLE_EMAIL/SMTP is not configured",
        undefined,
        { toDomain: input.email.split("@")[1] ?? "unknown" },
      );
      return;
    }

    logger.warn(
      "Password reset email skipped (email disabled); use admin reset or AuthVerification for local recovery",
    );
    return;
  }

  try {
    await smtpEmailSender.send({
      to: input.email,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) {
      logger.error("Password reset email aborted: email not configured");
      return;
    }

    logger.error(
      "Failed to send password reset email",
      error,
    );
    throw error;
  }
}

export { buildPasswordResetEmail };
