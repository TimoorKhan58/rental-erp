"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppForm } from "@/components/forms";
import { PasswordField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { SectionCard } from "@/components/design-system/card";
import { changePassword } from "@/lib/auth/client";
import {
  createChangePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/auth/change-password-form.schema";

const GENERIC_ERROR_MESSAGE =
  "Unable to change password. Check your current password and try again.";

const SUCCESS_MESSAGE = "Your password has been updated.";

type ChangePasswordFormProps = {
  minPasswordLength: number;
};

export function ChangePasswordForm({ minPasswordLength }: ChangePasswordFormProps) {
  const schema = useMemo(
    () => createChangePasswordSchema(minPasswordLength),
    [minPasswordLength],
  );

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: ChangePasswordFormValues) {
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    const result = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(GENERIC_ERROR_MESSAGE);
      return;
    }

    form.reset({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setSuccess(true);
  }

  return (
    <AppForm form={form} onSubmit={onSubmit} className="space-y-6">
      <SectionCard
        title="Change password"
        description="Update the password for your signed-in account."
        actions={
          <AppButton
            type="submit"
            loading={isSubmitting}
            disabled={!form.formState.isDirty}
          >
            Update password
          </AppButton>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <PasswordField
            control={form.control}
            name="currentPassword"
            label="Current password"
            className="md:col-span-2 md:max-w-md"
          />
          <PasswordField
            control={form.control}
            name="newPassword"
            label="New password"
            description={`At least ${minPasswordLength} characters.`}
          />
          <PasswordField
            control={form.control}
            name="confirmPassword"
            label="Confirm new password"
          />
        </div>
        {error ? (
          <p
            className="mt-4 rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-foreground"
            role="status"
          >
            {SUCCESS_MESSAGE}
          </p>
        ) : null}
      </SectionCard>
    </AppForm>
  );
}
