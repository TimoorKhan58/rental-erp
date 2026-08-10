"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import {
  CheckboxField,
  DatePickerField,
  NumberField,
  TextAreaField,
  TextField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  maintenanceAssetFormSchema,
  type MaintenanceAssetFormValues,
} from "../schemas";
import { useAddAssetMaintenance } from "../hooks";
import { toMaintenancePayload } from "../mappers";
import type { AssetResponse } from "../types";

type MaintenanceAssetDialogProps = {
  asset: AssetResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MaintenanceAssetDialog({
  asset,
  open,
  onOpenChange,
}: MaintenanceAssetDialogProps) {
  const maintenanceMutation = useAddAssetMaintenance();
  const form = useForm<MaintenanceAssetFormValues>({
    resolver: zodResolver(maintenanceAssetFormSchema),
    defaultValues: {
      serviceDate: new Date().toISOString(),
      vendor: "",
      cost: 0,
      description: "",
      setUnderMaintenance: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        serviceDate: new Date().toISOString(),
        vendor: "",
        cost: undefined as unknown as number,
        description: "",
        setUnderMaintenance: false,
      });
    }
  }, [open, form]);

  if (!asset) {
    return null;
  }

  const handleSubmit = async (values: MaintenanceAssetFormValues) => {
    await maintenanceMutation.mutateAsync({
      id: asset.id,
      payload: toMaintenancePayload(values),
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Record maintenance"
      description={`Add a maintenance record for "${asset.assetCode}".`}
      size="md"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <DatePickerField
          control={form.control}
          name="serviceDate"
          label="Service date"
        />
        <TextField
          control={form.control}
          name="vendor"
          label="Service vendor"
          placeholder="Optional free-text vendor"
        />
        <NumberField
          control={form.control}
          name="cost"
          label="Cost"
          min={0}
          step={0.01}
        />
        <TextAreaField
          control={form.control}
          name="description"
          label="Description"
          placeholder="What work was performed?"
        />
        {asset.status === "ACTIVE" ? (
          <CheckboxField
            control={form.control}
            name="setUnderMaintenance"
            label="Mark asset as under maintenance"
          />
        ) : null}
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={maintenanceMutation.isPending}>
            Save record
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
