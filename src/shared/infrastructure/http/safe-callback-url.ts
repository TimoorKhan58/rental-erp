import { ROUTES } from "@/config/routes";

/**
 * Allow only same-origin relative paths for post-login redirects.
 * Rejects protocol-relative (`//evil`), absolute URLs, and empty values.
 */
export function sanitizeCallbackUrl(
  candidate: string | null | undefined,
  fallback: string = ROUTES.dashboard,
): string {
  if (candidate == null) {
    return fallback;
  }

  const trimmed = candidate.trim();

  if (trimmed.length === 0) {
    return fallback;
  }

  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Protocol-relative or scheme-smuggling: `//evil.com`, `/\evil`, `/\\evil`
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
