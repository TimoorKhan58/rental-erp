import type { APIRequestContext, Page } from "@playwright/test";
import { hasE2ECredentials, loginAsE2EUser } from "./ux";
import { deleteUserByEmail, hasDatabaseUrl } from "./db";

export const INVITE_WARNING_COPY =
  /User created successfully, but the invitation email could not be delivered/i;

export const RESET_INVALID_COPY =
  /This reset link is invalid or has expired\. Request a new one\./i;

export function hasInvitationE2EPrerequisites(): boolean {
  return hasE2ECredentials() && hasDatabaseUrl();
}

export function uniqueInviteeEmail(prefix = "invitee"): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}.${stamp}@example.com`;
}

export type CreateUserApiResult = {
  status: number;
  body: {
    data?: {
      id: string;
      email: string;
      invitationDelivered?: boolean;
    };
    error?: {
      message?: string;
      code?: string;
      details?: unknown;
    };
    requestId?: string;
  };
};

export async function createUserViaApi(
  request: APIRequestContext,
  input: {
    name: string;
    email: string;
    role?: string;
    isActive?: boolean;
  },
): Promise<CreateUserApiResult> {
  const response = await request.post("/api/users", {
    data: {
      name: input.name,
      email: input.email,
      role: input.role ?? "viewer",
      isActive: input.isActive ?? true,
    },
    headers: { "Content-Type": "application/json" },
  });

  const body = (await response.json()) as CreateUserApiResult["body"];
  return { status: response.status(), body };
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAsE2EUser(page);
}

export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });
}

export async function completeInvitePasswordSetup(
  page: Page,
  options: { token: string; password: string },
): Promise<void> {
  await page.goto(
    `/reset-password?invite=1&token=${encodeURIComponent(options.token)}`,
  );
  await page.getByLabel(/^new password$/i).fill(options.password);
  await page.getByLabel(/confirm password/i).fill(options.password);
  await page.getByRole("button", { name: /create password|update password/i }).click();
  await page.getByText(/password has been (created|updated)/i).waitFor({
    timeout: 15_000,
  });
}

export async function cleanupInvitee(email: string): Promise<void> {
  try {
    await deleteUserByEmail(email);
  } catch {
    // Best-effort cleanup when DB is unavailable mid-failure.
  }
}
