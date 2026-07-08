import { env } from "@/shared/config/env";

export function getAuthEnv() {
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
  };
}

export function assertAuthEnvConfigured(): void {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET is not configured. Generate one with: openssl rand -base64 32",
    );
  }
}
