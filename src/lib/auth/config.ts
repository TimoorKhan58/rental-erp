import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { DEFAULT_USER_ROLE } from "@/constants/roles";
import prisma from "@/lib/prisma";
import { appConfig } from "@/shared/config/app.config";
import { authConfig } from "@/shared/config/auth.config";
import { securityConfig } from "@/shared/config/security.config";
import { assertAuthUserMayCreateSession } from "@/shared/infrastructure/auth";
import {
  isInvitationPasswordSetupUrl,
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendVerificationEmailMessage,
} from "@/shared/infrastructure/email";

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
    /**
     * Keep login open for unverified users until a later Phase 15B step.
     * System Settings `requireEmailVerification` remains unwired.
     */
    requireEmailVerification: false,
    /**
     * Enables Better Auth `/request-password-reset`.
     * Tokens are stored in AuthVerification; delivery uses SMTP when ENABLE_EMAIL is on.
     */
    sendResetPassword: async ({ user, url }) => {
      if (isInvitationPasswordSetupUrl(url)) {
        await sendInvitationEmail({
          email: user.email,
          name: user.name,
          url,
        });
        return;
      }

      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        url,
      });
    },
    /** Match admin reset behavior: invalidate existing sessions after self-service reset. */
    revokeSessionsOnPasswordReset: true,
  },
  /**
   * Enables Better Auth `/send-verification-email` and `/verify-email`.
   * Tokens are signed JWTs (not AuthVerification rows); delivery uses SMTP when ENABLE_EMAIL is on.
   */
  emailVerification: {
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmailMessage({
        email: user.email,
        name: user.name,
        url,
      });
    },
  },
  // Prisma models are Auth* because `User`/`Account` are ERP entities.
  // modelName must match Prisma client keys (camelCase).
  user: {
    modelName: "authUser",
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
    modelName: "authSession",
    expiresIn: authConfig.session.expiresInSeconds,
    updateAge: authConfig.session.updateAgeSeconds,
    cookieCache: {
      enabled: authConfig.session.cookieCacheMaxAgeSeconds > 0,
      maxAge: authConfig.session.cookieCacheMaxAgeSeconds,
    },
  },
  account: {
    modelName: "authAccount",
  },
  verification: {
    modelName: "authVerification",
  },
  /**
   * Block session creation when the AuthUser is not linked to an active ERP User.
   * Matches API auth policy in resolveActiveSessionUser / authenticateApiRequest.
   */
  databaseHooks: {
    session: {
      create: {
        async before(session) {
          await assertAuthUserMayCreateSession(session.userId);
        },
      },
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
      // Prefer single-value edge headers (Render/Cloudflare) before multi-hop XFF.
      // Nginx Docker sets x-real-ip; Render typically sets cf-connecting-ip.
      ipAddressHeaders: [
        "cf-connecting-ip",
        "true-client-ip",
        "x-real-ip",
        "x-forwarded-for",
      ],
      ...(securityConfig.trustedProxies.length > 0
        ? { trustedProxies: [...securityConfig.trustedProxies] }
        : {}),
      disableIpTracking: false,
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
