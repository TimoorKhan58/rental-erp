export type VerificationOutcome = "success" | "failure" | "neutral";

/**
 * Map Better Auth callback query params to a verification result UX state.
 * Direct visits (no status/error) are neutral — never a false success.
 */
export function resolveVerificationOutcome(
  status: string | null,
  error: string | null,
): VerificationOutcome {
  if (error !== null && error.length > 0) {
    return "failure";
  }

  if (status === "success") {
    return "success";
  }

  return "neutral";
}
