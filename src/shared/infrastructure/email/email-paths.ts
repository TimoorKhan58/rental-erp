/** Client-safe path constants for auth email redirects (no Node/SMTP imports). */

/** App route that shows success/failure after Better Auth validates the JWT. */
export const VERIFICATION_RESULT_PATH = "/verify-email";

/**
 * Callback used in verification emails so a successful BA redirect is distinguishable
 * from a direct visit to `/verify-email`.
 */
export const VERIFICATION_SUCCESS_CALLBACK = "/verify-email?status=success";

/** Marks BA password-reset redirects as invitation password setup. */
export const INVITATION_PASSWORD_SETUP_PATH = "/reset-password?invite=1";
