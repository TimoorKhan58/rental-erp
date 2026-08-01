import { appConfig } from "@/shared/config/app.config";
import { createAppLogger } from "@/shared/infrastructure/logging";
import {
  EmailNotConfiguredError,
  smtpEmailSender,
} from "./smtp-email-sender";
import { INVITATION_PASSWORD_SETUP_PATH } from "./email-paths";

export type InvitationEmailInput = {
  readonly email: string;
  readonly name: string;
  readonly url: string;
};

export { INVITATION_PASSWORD_SETUP_PATH } from "./email-paths";
/**
 * Generic delivery failure for invitations.
 * Message is safe for logs; never include SMTP host/credentials.
 */
export class InvitationEmailNotDeliveredError extends Error {
  constructor() {
    super("Invitation email could not be delivered");
    this.name = "InvitationEmailNotDeliveredError";
  }
}

/**
 * Detect invitation setup links produced by Better Auth password-reset
 * with `redirectTo` containing `invite=1`.
 */
export function isInvitationPasswordSetupUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const callback = parsed.searchParams.get("callbackURL");
    if (callback === null) {
      return url.includes("invite=1");
    }

    const decoded = decodeURIComponent(callback);
    return decoded.includes("invite=1");
  } catch {
    return url.includes("invite=1");
  }
}

function buildInvitationEmail(input: InvitationEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `You're invited to ${appConfig.name}`;
  const greeting = input.name.trim().length > 0 ? input.name.trim() : "there";

  const text = [
    `Hi ${greeting},`,
    "",
    `You've been invited to ${appConfig.name}.`,
    "Click the link below to create your password and activate your account.",
    "",
    input.url,
    "",
    "This link expires after a short time for security. If you did not expect this invitation, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>Hi ${escapeHtml(greeting)},</p>
    <p>You've been invited to <strong>${escapeHtml(appConfig.name)}</strong>.</p>
    <p><a href="${escapeHtml(input.url)}">Create your password</a></p>
    <p>This link expires after a short time for security. If you did not expect this invitation, you can ignore this email.</p>
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
 * Deliver an invitation / first-password email via SMTP.
 * Uses the same Better Auth password-reset URL shape as forgot-password.
 * Throws {@link InvitationEmailNotDeliveredError} when delivery does not succeed
 * so callers can surface operational visibility without SMTP details.
 */
export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<void> {
  const logger = createAppLogger({
    bindings: { component: "invitation-email" },
  });
  const payload = buildInvitationEmail(input);

  if (!smtpEmailSender.isReady()) {
    if (appConfig.isHardened) {
      logger.error(
        "Invitation email skipped: ENABLE_EMAIL/SMTP is not configured",
        undefined,
        { toDomain: input.email.split("@")[1] ?? "unknown" },
      );
    } else {
      logger.warn(
        "Invitation email skipped (email disabled); use admin reset or AuthVerification for local recovery",
      );
    }

    throw new InvitationEmailNotDeliveredError();
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
      logger.error("Invitation email aborted: email not configured");
      throw new InvitationEmailNotDeliveredError();
    }

    logger.error("Failed to send invitation email", error);
    throw new InvitationEmailNotDeliveredError();
  }
}

export { buildInvitationEmail };
