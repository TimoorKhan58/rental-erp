import { appConfig } from "@/shared/config/app.config";
import { createAppLogger } from "@/shared/infrastructure/logging";
import {
  EmailNotConfiguredError,
  smtpEmailSender,
} from "./smtp-email-sender";
import { VERIFICATION_SUCCESS_CALLBACK } from "./email-paths";

export type VerificationEmailInput = {
  readonly email: string;
  readonly name: string;
  readonly url: string;
};

export {
  VERIFICATION_RESULT_PATH,
  VERIFICATION_SUCCESS_CALLBACK,
} from "./email-paths";
/**
 * Ensure Better Auth's verify link redirects to the public result page.
 * BA remains responsible for JWT validation and setting `emailVerified`.
 */
export function withVerificationResultCallback(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("callbackURL", VERIFICATION_SUCCESS_CALLBACK);
    return parsed.toString();
  } catch {
    return url;
  }
}

function buildVerificationEmail(input: VerificationEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Verify your ${appConfig.name} email`;
  const greeting = input.name.trim().length > 0 ? input.name.trim() : "there";

  const text = [
    `Hi ${greeting},`,
    "",
    `Please verify the email address for your ${appConfig.name} account.`,
    "Open the link below to confirm your email. If you did not expect this message, you can ignore it.",
    "",
    input.url,
    "",
    "This link expires after a short time for security.",
  ].join("\n");

  const html = `
    <p>Hi ${escapeHtml(greeting)},</p>
    <p>Please verify the email address for your <strong>${escapeHtml(appConfig.name)}</strong> account.</p>
    <p><a href="${escapeHtml(input.url)}">Verify your email</a></p>
    <p>If you did not expect this message, you can ignore it. This link expires after a short time for security.</p>
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
 * Deliver Better Auth's email-verification message via SMTP.
 * When email is disabled locally, logs the verification URL so developers can continue.
 * Does not throw when email is disabled (avoids user enumeration via 500s).
 */
export async function sendVerificationEmailMessage(
  input: VerificationEmailInput,
): Promise<void> {
  const logger = createAppLogger({
    bindings: { component: "verification-email" },
  });
  const url = withVerificationResultCallback(input.url);
  const payload = buildVerificationEmail({ ...input, url });

  if (!smtpEmailSender.isReady()) {
    if (appConfig.isHardened) {
      logger.error(
        "Verification email skipped: ENABLE_EMAIL/SMTP is not configured",
        undefined,
        { toDomain: input.email.split("@")[1] ?? "unknown" },
      );
      return;
    }

    logger.warn(
      "Verification email skipped (email disabled); use Security settings resend for local recovery",
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
      logger.error("Verification email aborted: email not configured");
      return;
    }

    logger.error("Failed to send verification email", error);
    throw error;
  }
}

export { buildVerificationEmail };
