"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  createAssetCategoryFormSchema,
  type CreateAssetCategoryFormValues,
} from "../schemas";
import { useCreateAssetCategory } from "../hooks";

type CreateAssetCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateAssetCategoryDialog({
  open,
  onOpenChange,
}: CreateAssetCategoryDialogProps) {
  const createMutation = useCreateAssetCategory();
  const form = useForm<CreateAssetCategoryFormValues>({
    resolver: zodResolver(createAssetCategoryFormSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: "", description: "" });
    }
  }, [open, form]);

  const handleSubmit = async (values: CreateAssetCategoryFormValues) => {
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
      title="New asset category"
      description="Create a category for classifying fixed assets."
      size="sm"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <TextField control={form.control} name="name" label="Name" placeholder="e.g. Vehicles" />
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
