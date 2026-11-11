"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCOUNT_TYPE_LABELS } from "../mappers";
import { ACCOUNT_TYPES } from "../types";
import {
  createAccountFormSchema,
  type CreateAccountFormValues,
} from "../schemas";
import { useCreateAccount } from "../hooks";

type CreateAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateAccountDialog({ open, onOpenChange }: CreateAccountDialogProps) {
  const createMutation = useCreateAccount();
  const form = useForm<CreateAccountFormValues>({
    resolver: zodResolver(createAccountFormSchema),
    defaultValues: {
      accountCode: "",
      name: "",
      accountType: "EXPENSE",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        accountCode: "",
        name: "",
        accountType: "EXPENSE",
        description: "",
      });
    }
  }, [open, form]);

  const handleSubmit = async (values: CreateAccountFormValues) => {
    await createMutation.mutateAsync({
      accountCode: values.accountCode.trim(),
      name: values.name.trim(),
      accountType: values.accountType,
      description: values.description?.trim() || null,
      isActive: true,
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="New account"
      description="Add an account to the chart of accounts."
      size="sm"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <TextField
          control={form.control}
          name="accountCode"
          label="Account code"
          placeholder="e.g. 5100"
        />
        <TextField control={form.control} name="name" label="Name" placeholder="Account name" />
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="accountType">
            Account type
          </label>
          <Select
            value={form.watch("accountType")}
            onValueChange={(value) => {
              if (value) {
                form.setValue("accountType", value as CreateAccountFormValues["accountType"], {
                  shouldValidate: true,
                });
              }
            }}
          >
            <SelectTrigger id="accountType" aria-label="Account type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TextField
          control={form.control}
          name="description"
          label="Description"
          placeholder="Optional"
        />
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={createMutation.isPending}>
            Create account
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
