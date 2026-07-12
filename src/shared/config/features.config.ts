import { env } from "./env";

/**
 * Environment-driven feature flags.
 * Business modules should read these instead of process.env.
 */
export const featureFlags = {
  email: env.ENABLE_EMAIL,
  sms: env.ENABLE_SMS,
} as const;

export type FeatureFlags = typeof featureFlags;
