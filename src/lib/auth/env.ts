import { authConfig } from "@/shared/config/auth.config";
import { env } from "@/shared/config/env";

export function getAuthEnv() {
  return {
    secret: authConfig.secret,
    baseURL: authConfig.baseURL,
  };
}

export function assertAuthEnvConfigured(): void {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET is not configured. Generate one with: openssl rand -base64 32",
    );
  }
}
