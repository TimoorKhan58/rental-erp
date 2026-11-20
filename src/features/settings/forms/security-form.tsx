"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import {
  NumberField,
  SwitchField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { SectionCard } from "@/components/design-system/card";
import {
  updateSecurityFormSchema,
  type UpdateSecurityFormValues,
} from "../schemas";
import { ReadOnlyField } from "../components/read-only-field";
import { ENVIRONMENT_LABELS } from "../mappers";
import type { SecuritySettingsView } from "../types";

type SecurityFormProps = {
  security: SecuritySettingsView;
  canUpdate: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: UpdateSecurityFormValues) => void | Promise<void>;
};

export function SecurityForm({
  security,
  canUpdate,
  isSubmitting = false,
  onSubmit,
}: SecurityFormProps) {
  const form = useForm<UpdateSecurityFormValues>({
    resolver: zodResolver(updateSecurityFormSchema),
    defaultValues: {
      minPasswordLength: security.minPasswordLength,
      maxLoginAttempts: security.maxLoginAttempts,
      lockoutDurationMinutes: security.lockoutDurationMinutes,
      requireEmailVerification: security.requireEmailVerification,
      allowPasswordReset: security.allowPasswordReset,
      sessionTimeoutMinutes: security.sessionTimeoutMinutes,
      rememberMeDurationDays: security.rememberMeDurationDays,
      maxConcurrentSessions: security.maxConcurrentSessions,
      passwordExpiryDays: security.passwordExpiryDays,
      ipWhitelistEnabled: security.ipWhitelistEnabled,
    },
  });

  useEffect(() => {
    form.reset({
      minPasswordLength: security.minPasswordLength,
      maxLoginAttempts: security.maxLoginAttempts,
      lockoutDurationMinutes: security.lockoutDurationMinutes,
      requireEmailVerification: security.requireEmailVerification,
      allowPasswordReset: security.allowPasswordReset,
      sessionTimeoutMinutes: security.sessionTimeoutMinutes,
      rememberMeDurationDays: security.rememberMeDurationDays,
      maxConcurrentSessions: security.maxConcurrentSessions,
      passwordExpiryDays: security.passwordExpiryDays,
      ipWhitelistEnabled: security.ipWhitelistEnabled,
    });
  }, [security, form]);

  const disabled = !canUpdate;

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
        <dl className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Application" value={security.appName} />
          <ReadOnlyField label="Version" value={security.appVersion} />
          <ReadOnlyField
            label="Running as"
            value={ENVIRONMENT_LABELS[security.environment] ?? security.environment}
          />
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Forgotten passwords: the owner can set a temporary one from Users. Two-step sign-in is not
          available yet.
        </p>
      </SectionCard>

      <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
        <SectionCard
          title="Security policy"
          description="These settings are saved for reference. Sign-in rules (password length, lockouts and how long people stay signed in) are set on the server and are not changed here."
          actions={
            canUpdate ? (
              <AppButton
                type="submit"
                loading={isSubmitting}
                disabled={!form.formState.isDirty}
              >
                Save security settings
              </AppButton>
            ) : null
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField
              control={form.control}
              name="minPasswordLength"
              label="Minimum password length"
              description="For your records. The real minimum is set when RentCore is installed."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="maxLoginAttempts"
              label="Max login attempts"
              description="For your records. Repeated wrong sign-ins are already slowed down automatically."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="lockoutDurationMinutes"
              label="Lockout duration (minutes)"
              description="For your records. Accounts are not locked yet."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="sessionTimeoutMinutes"
              label="Session timeout (minutes)"
              description="For your records. How long people stay signed in is set when RentCore is installed."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="rememberMeDurationDays"
              label="Remember-me duration (days)"
              description="For your records. Not applied yet."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="maxConcurrentSessions"
              label="Max concurrent sessions"
              description="For your records. Not applied yet."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="passwordExpiryDays"
              label="Password expiry (days)"
              description="For your records. Leave empty for no expiry. Passwords do not expire yet."
              disabled={disabled}
            />
            <SwitchField
              control={form.control}
              name="requireEmailVerification"
              label="Require email verification"
              description="For your records. Not applied yet."
              disabled={disabled}
            />
            <SwitchField
              control={form.control}
              name="allowPasswordReset"
              label="Allow password reset"
              description="For your records. The owner can always set a temporary password from Users."
              disabled={disabled}
            />
            <SwitchField
              control={form.control}
              name="ipWhitelistEnabled"
              label="Only allow sign-in from known places"
              description="For your records. Not applied yet."
              disabled={disabled}
            />
          </div>
        </SectionCard>
      </AppForm>
    </div>
  );
}
