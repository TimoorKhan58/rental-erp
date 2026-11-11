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
      <SectionCard title="Authentication status">
        <dl className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Application" value={security.appName} />
          <ReadOnlyField label="Version" value={security.appVersion} />
          <ReadOnlyField
            label="Environment"
            value={ENVIRONMENT_LABELS[security.environment] ?? security.environment}
          />
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Self-service password change, active session management, and MFA are not
          exposed by the current authentication APIs. Use an administrator password
          reset when credential changes are required.
        </p>
      </SectionCard>

      <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
        <SectionCard
          title="Security policy"
          description="These values are saved on the system settings record. Sign-in, password length, lockout, and sessions are enforced by Better Auth and server environment configuration — not by these fields."
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
              description="Stored policy record. Live password rules use AUTH_MIN_PASSWORD_LENGTH."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="maxLoginAttempts"
              label="Max login attempts"
              description="Stored policy record. Live sign-in limits use Better Auth rate-limit environment settings."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="lockoutDurationMinutes"
              label="Lockout duration (minutes)"
              description="Stored policy record. It does not currently lock accounts after failed attempts."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="sessionTimeoutMinutes"
              label="Session timeout (minutes)"
              description="Stored policy record. Session lifetime uses AUTH_SESSION_EXPIRES_IN_SECONDS."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="rememberMeDurationDays"
              label="Remember-me duration (days)"
              description="Stored policy record. It is not applied to the current session cookie."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="maxConcurrentSessions"
              label="Max concurrent sessions"
              description="Stored policy record. Concurrent sessions are not limited from this field."
              disabled={disabled}
            />
            <NumberField
              control={form.control}
              name="passwordExpiryDays"
              label="Password expiry (days)"
              description="Stored policy record. Leave empty to store no expiry. Passwords do not expire from this field."
              disabled={disabled}
            />
            <SwitchField
              control={form.control}
              name="requireEmailVerification"
              label="Require email verification"
              description="Stored flag only. Sign-in does not require email verification from this switch."
              disabled={disabled}
            />
            <SwitchField
              control={form.control}
              name="allowPasswordReset"
              label="Allow password reset"
              description="Stored flag only. Administrator password reset remains available from Users."
              disabled={disabled}
            />
            <SwitchField
              control={form.control}
              name="ipWhitelistEnabled"
              label="IP whitelist enabled"
              description="Stored flag only. Sign-in does not apply an IP allow-list from this switch."
              disabled={disabled}
            />
          </div>
        </SectionCard>
      </AppForm>
    </div>
  );
}
