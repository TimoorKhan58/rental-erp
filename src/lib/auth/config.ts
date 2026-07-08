import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { DEFAULT_USER_ROLE } from "@/constants/roles";
import prisma from "@/lib/prisma";
import { appConfig } from "@/shared/config/app.config";
import { getAuthEnv } from "./env";

const { secret, baseURL } = getAuthEnv();

export const auth = betterAuth({
  appName: appConfig.name,
  baseURL,
  secret,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
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
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  advanced: {
    useSecureCookies: appConfig.isProduction,
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
