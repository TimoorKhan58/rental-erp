import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { DEFAULT_USER_ROLE } from "@/constants/roles";
import prisma from "@/lib/prisma";
import { appConfig } from "@/shared/config/app.config";
import { authConfig } from "@/shared/config/auth.config";

const trustedOrigins = Array.from(
  new Set(
    [authConfig.baseURL, appConfig.url, authConfig.trustedOrigins]
      .flat()
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  ),
);

export const auth = betterAuth({
  appName: appConfig.name,
  baseURL: authConfig.baseURL,
  secret: authConfig.secret,
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: authConfig.minPasswordLength,
  },
  disabledPaths: ["/sign-up/email"],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: DEFAULT_USER_ROLE,
        input: false,
      },
      erpUserId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: authConfig.session.expiresInSeconds,
    updateAge: authConfig.session.updateAgeSeconds,
    cookieCache: {
      enabled: true,
      maxAge: authConfig.session.cookieCacheMaxAgeSeconds,
    },
  },
  /**
   * Built-in Better Auth rate limiting (in-memory per process).
   * Nginx also applies limit_req on /api/auth/ for edge protection.
   */
  rateLimit: {
    enabled: authConfig.rateLimit.enabled,
    window: authConfig.rateLimit.windowSeconds,
    max: authConfig.rateLimit.maxRequests,
    customRules: {
      "/sign-in/email": {
        window: authConfig.rateLimit.signInWindowSeconds,
        max: authConfig.rateLimit.signInMaxRequests,
      },
      "/request-password-reset": {
        window: authConfig.rateLimit.passwordResetWindowSeconds,
        max: authConfig.rateLimit.passwordResetMaxRequests,
      },
      "/forget-password": {
        window: authConfig.rateLimit.passwordResetWindowSeconds,
        max: authConfig.rateLimit.passwordResetMaxRequests,
      },
      "/reset-password": {
        window: authConfig.rateLimit.passwordResetWindowSeconds,
        max: authConfig.rateLimit.passwordResetMaxRequests,
      },
    },
  },
  advanced: {
    useSecureCookies: authConfig.useSecureCookies,
    // Explicit CSRF / origin checks — do not disable in production.
    disableCSRFCheck: false,
    disableOriginCheck: false,
    defaultCookieAttributes: {
      httpOnly: true,
      secure: authConfig.useSecureCookies,
      sameSite: "lax",
      path: "/",
    },
    ipAddress: {
      ipAddressHeaders: ["x-real-ip", "x-forwarded-for"],
      disableIpTracking: false,
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
