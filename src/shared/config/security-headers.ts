/**
 * Shared Content-Security-Policy baseline for Next.js App Router + Nginx.
 *
 * Compromises (documented in docs/production/SECURITY_HARDENING.md):
 * - script-src includes 'unsafe-inline' (Next.js inline bootstrapping without nonce wiring yet)
 * - style-src includes 'unsafe-inline' (Tailwind / CSS runtime)
 * - 'unsafe-eval' is intentionally omitted (not required for production Next builds)
 * - COEP is not set (breaks many third-party embeds; not needed for this ERP)
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

export function buildSecurityHeaders(options: {
  enableHsts: boolean;
}): { key: string; value: string }[] {
  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    {
      key: "X-Permitted-Cross-Domain-Policies",
      value: "none",
    },
    { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
    ...(options.enableHsts
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
      : []),
  ];
}
