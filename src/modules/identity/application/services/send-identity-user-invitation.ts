import { auth } from "@/lib/auth";
import {
  INVITATION_PASSWORD_SETUP_PATH,
  InvitationEmailNotDeliveredError,
  smtpEmailSender,
} from "@/shared/infrastructure/email";

/**
 * Trigger Better Auth's native password-reset flow for a newly invited user.
 * Tokens live in AuthVerification; delivery uses sendResetPassword (invite branch).
 *
 * Better Auth may run the email callback as a background task, so a resolved
 * requestPasswordReset does not guarantee delivery. When SMTP is not ready we
 * still mint the token, then fail closed for invitationDelivered visibility.
 */
export async function sendIdentityUserInvitation(email: string): Promise<void> {
  await auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: INVITATION_PASSWORD_SETUP_PATH,
    },
  });

  if (!smtpEmailSender.isReady()) {
    throw new InvitationEmailNotDeliveredError();
  }
}
