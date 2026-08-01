"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { PasswordField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from "../schemas";
import { useResetUserPassword } from "../hooks";
import type { IdentityUserResponse } from "../types";

type ResetPasswordDialogProps = {
  user: IdentityUserResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: ResetPasswordDialogProps) {
  const resetMutation = useResetUserPassword();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        password: "",
        confirmPassword: "",
      });
    }
  }, [open, form]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    await resetMutation.mutateAsync({
      id: user.id,
      payload: { password: values.password },
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Reset password"
      description={`Set a new password for ${user.name}. All active sessions for this user will be revoked.`}
      size="md"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          control={form.control}
          name="password"
          label="New password"
          description="Minimum 8 characters."
        />
        <PasswordField
          control={form.control}
          name="confirmPassword"
          label="Confirm password"
        />

        <div className="flex justify-end gap-2">
          <AppButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resetMutation.isPending}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" loading={resetMutation.isPending}>
            Reset password
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
