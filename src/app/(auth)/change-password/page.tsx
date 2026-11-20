import type { Metadata } from "next";

import { ROUTES } from "@/config/routes";
import { ChangePasswordForm } from "@/features/account/forms/change-password-form";

export const metadata: Metadata = { title: "Change password" };

/**
 * Choose your own password (SaaS phase 3c). Users with a temporary password
 * are sent here by the proxy until they have changed it.
 */
export default function ChangePasswordPage() {
  return (
    <>
      <div className="mb-7">
        <h1 className="font-heading text-[1.75rem] font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your current password, then choose a new one. If someone else set your password, use
          the one they gave you as the current password.
        </p>
      </div>
      <ChangePasswordForm />
      <p className="mt-6 flex justify-center gap-6 text-sm text-muted-foreground">
        <a className="font-medium text-primary underline-offset-4 hover:underline" href={ROUTES.dashboard}>
          Back to the app
        </a>
        <a className="font-medium text-primary underline-offset-4 hover:underline" href={ROUTES.logout}>
          Sign out
        </a>
      </p>
    </>
  );
}
