"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AppButton } from "@/components/design-system/button";
import { PasswordField } from "@/components/design-system/form";
import { AppForm } from "@/components/forms";
import { apiPost } from "@/lib/api";
import { ApiClientError } from "@/lib/api/types";

const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(128, "Use at most 128 characters")
      .refine((value) => value.trim().length > 0, "Password cannot be only spaces"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "The passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "Choose a password different from the current one",
    path: ["newPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

/** Choose a new password (required after a temporary one; SaaS phase 3c). */
export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const handleSubmit = async (values: ChangePasswordFormValues) => {
    setError(null);
    try {
      await apiPost("/account/password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      // A full load lets the server re-check the account and open the app.
      window.location.assign("/");
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : "Could not change the password. Please try again.",
      );
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
      <PasswordField
        control={form.control}
        name="currentPassword"
        label="Current password"
        disabled={isSubmitting}
      />
      <PasswordField
        control={form.control}
        name="newPassword"
        label="New password"
        description="At least 8 characters. Only you will know it."
        disabled={isSubmitting}
      />
      <PasswordField
        control={form.control}
        name="confirmPassword"
        label="Confirm new password"
        disabled={isSubmitting}
      />
      {error !== null && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <AppButton type="submit" className="w-full" loading={isSubmitting}>
        Save new password
      </AppButton>
    </AppForm>
  );
}
