import { securityConfig } from "@/shared/config/security.config";

/**
 * Resolve client IP for audit / rate-limit context.
 *
 * When TRUSTED_PROXIES is empty, ignore client-supplied forwarding headers
 * (prevents spoofing if the app is ever exposed without a reverse proxy).
 * When proxies are configured, prefer X-Real-IP then the first X-Forwarded-For hop.
 */
export function resolveClientIp(headers: Headers): string | undefined {
  if (securityConfig.trustedProxies.length === 0) {
    return undefined;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) {
    return undefined;
  }

  const first = forwarded.split(",")[0]?.trim();
  return first && first.length > 0 ? first : undefined;
}
