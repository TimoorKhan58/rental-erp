"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  createExpenseCategoryFormSchema,
  type CreateExpenseCategoryFormValues,
} from "../schemas";
import { useCreateExpenseCategory } from "../hooks";

type CreateExpenseCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateExpenseCategoryDialog({
  open,
  onOpenChange,
}: CreateExpenseCategoryDialogProps) {
  const createMutation = useCreateExpenseCategory();
  const form = useForm<CreateExpenseCategoryFormValues>({
    resolver: zodResolver(createExpenseCategoryFormSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: "", description: "" });
    }
  }, [open, form]);

  const handleSubmit = async (values: CreateExpenseCategoryFormValues) => {
    await createMutation.mutateAsync({
      name: values.name.trim(),
      description: values.description?.trim() || null,
      isActive: true,
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="New expense category"
      description="Create a category for classifying expenses."
      size="sm"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <TextField control={form.control} name="name" label="Name" placeholder="e.g. Fuel" />
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
            Create category
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
