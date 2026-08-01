/**
 * Sanitize post-login redirect targets.
 * Aligns with Better Auth trusted-origin relative-path rules:
 * `/^\/(?!\/|\\|%2f|%5c)[\w\-.\+/@]*(?:\?[\w\-.\+/=&%@]*)?$/`
 */
const SAFE_RELATIVE_CALLBACK_URL =
  /^\/(?!\/|\\|%2f|%5c)[\w\-.+\/@]*(?:\?[\w\-.+/=&%@]*)?$/i;

export function sanitizeCallbackUrl(value: string | null | undefined): string {
  if (value === null || value === undefined || value.length === 0) {
    return "/";
  }

  if (!SAFE_RELATIVE_CALLBACK_URL.test(value)) {
    return "/";
  }

  return value;
}
