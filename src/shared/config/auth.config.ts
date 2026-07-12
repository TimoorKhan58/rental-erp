import { env } from "./env";

function uniqueOrigins(...candidates: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      candidates
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value && value.length > 0)),
    ),
  );
}

export const authConfig = {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  minPasswordLength: env.AUTH_MIN_PASSWORD_LENGTH,
  session: {
    expiresInSeconds: env.AUTH_SESSION_EXPIRES_IN_SECONDS,
    updateAgeSeconds: env.AUTH_SESSION_UPDATE_AGE_SECONDS,
    cookieCacheMaxAgeSeconds: env.AUTH_COOKIE_CACHE_MAX_AGE_SECONDS,
  },
  useSecureCookies: env.SECURE_COOKIES,
  /** Extra CSRF / redirect origins beyond APP_URL / BETTER_AUTH_URL. */
  trustedOrigins: uniqueOrigins(...env.AUTH_TRUSTED_ORIGINS),
  rateLimit: {
    enabled: env.AUTH_RATE_LIMIT_ENABLED,
    windowSeconds: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    maxRequests: env.AUTH_RATE_LIMIT_MAX,
    signInWindowSeconds: env.AUTH_RATE_LIMIT_SIGN_IN_WINDOW_SECONDS,
    signInMaxRequests: env.AUTH_RATE_LIMIT_SIGN_IN_MAX,
    passwordResetWindowSeconds: env.AUTH_RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS,
    passwordResetMaxRequests: env.AUTH_RATE_LIMIT_PASSWORD_RESET_MAX,
  },
} as const;

export type AuthConfig = typeof authConfig;
