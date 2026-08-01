import { randomBytes } from "node:crypto";
import { authConfig } from "@/shared/config/auth.config";

/**
 * Cryptographically secure password for provisioned AuthAccounts.
 * Never shown to administrators — invitees set their own via BA reset.
 */
export function generateProvisioningPassword(): string {
  const minLength = authConfig.minPasswordLength;
  const length = Math.max(minLength, 32);
  return randomBytes(48).toString("base64url").slice(0, length);
}
