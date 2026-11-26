"use client";

import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { ROUTES } from "@/config/routes";
import { ReadOnlyField } from "../components/read-only-field";
import type { UpdateSecurityFormValues } from "../schemas";
import type { SecuritySettingsView } from "../types";

type SecurityFormProps = {
  security: SecuritySettingsView;
  canUpdate: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: UpdateSecurityFormValues) => void | Promise<void>;
};

/**
 * The "security policy" switches and numbers (login attempts, session length,
 * password expiry, IP list…) were all stored for reference and applied
 * nowhere, so they are no longer shown (usability revamp). What really works
 * is changing your own password and the owner setting a temporary one.
 */
export function SecurityForm({ security }: SecurityFormProps) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Your password"
        description="Change the password you use to sign in. Staff can do the same from their name at the top right."
        actions={
          <AppButton render={<a href={ROUTES.changePassword} />} variant="outline">
            Change my password
          </AppButton>
        }
      >
        <p className="text-sm text-muted-foreground">
          Choose a password only you know, at least 8 characters. If a staff member forgets theirs,
          the owner can set a temporary one from Users; they choose their own at their next sign-in.
        </p>
      </SectionCard>

      <SectionCard title="About this copy of RentCore">
        <dl className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Version" value={security.appVersion} />
        </dl>
      </SectionCard>
    </div>
  );
}
