import type { Metadata } from "next";

import { ROUTES } from "@/config/routes";
import { ChangePasswordForm } from "@/features/account/forms/change-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

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
          Your password was set by someone else. Choose your own to continue.
        </p>
      </div>
      <ChangePasswordForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <a className="font-medium text-primary underline-offset-4 hover:underline" href={ROUTES.logout}>
          Sign out
        </a>
      </p>
    </>
  );
}
