import { env } from "./env";

export const securityConfig = {
  trustedProxies: env.TRUSTED_PROXIES,
  secureCookies: env.SECURE_COOKIES,
  enableSecurityHeaders: env.ENABLE_SECURITY_HEADERS,
  enableHsts: env.ENABLE_HSTS,
} as const;

export type SecurityConfig = typeof securityConfig;
