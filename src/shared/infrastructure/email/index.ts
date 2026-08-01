export type { IEmailSender, SendEmailInput } from "./email-sender.interface";
export {
  VERIFICATION_RESULT_PATH,
  VERIFICATION_SUCCESS_CALLBACK,
  INVITATION_PASSWORD_SETUP_PATH,
} from "./email-paths";
export {
  buildInvitationEmail,
  isInvitationPasswordSetupUrl,
  sendInvitationEmail,
  InvitationEmailNotDeliveredError,
  type InvitationEmailInput,
} from "./invitation-email";
export {
  buildPasswordResetEmail,
  sendPasswordResetEmail,
  type PasswordResetEmailInput,
} from "./password-reset-email";
export {
  buildVerificationEmail,
  sendVerificationEmailMessage,
  withVerificationResultCallback,
  type VerificationEmailInput,
} from "./verification-email";
export {
  EmailNotConfiguredError,
  SmtpEmailSender,
  smtpEmailSender,
} from "./smtp-email-sender";
