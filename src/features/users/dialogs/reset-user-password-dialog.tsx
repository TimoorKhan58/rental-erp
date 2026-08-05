"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { PasswordField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { useResetUserPassword } from "../hooks";
import {
  resetUserPasswordFormSchema,
  type ResetUserPasswordFormValues,
} from "../schemas";
import type { UserResponse } from "../types";

type ResetUserPasswordDialogProps = {
  user: UserResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const defaultValues: ResetUserPasswordFormValues = {
  password: "",
  confirmPassword: "",
};

export function ResetUserPasswordDialog({
  user,
  open,
  onOpenChange,
}: ResetUserPasswordDialogProps) {
  const resetMutation = useResetUserPassword();
  const form = useForm<ResetUserPasswordFormValues>({
    resolver: zodResolver(resetUserPasswordFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, form]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (values: ResetUserPasswordFormValues) => {
    await resetMutation.mutateAsync({
      id: user.id,
      payload: { password: values.password },
    });
    form.reset(defaultValues);
    onOpenChange(false);
  };

  const isSubmitting = resetMutation.isPending;

  return (
    <AppModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSubmitting) {
          return;
        }
        onOpenChange(nextOpen);
      }}
      title="Reset password"
      description={`Set a new password for "${user.name}". Their existing sessions will be revoked and they must sign in again.`}
      size="md"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          control={form.control}
          name="password"
          label="New password"
          description="Minimum 8 characters."
          disabled={isSubmitting}
        />
        <PasswordField
          control={form.control}
          name="confirmPassword"
          label="Confirm password"
          disabled={isSubmitting}
        />
        <div className="flex justify-end gap-3 pt-2">
          <AppButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" loading={isSubmitting}>
            Reset password
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
