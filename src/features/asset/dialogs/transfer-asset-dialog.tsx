"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import {
  DatePickerField,
  SelectField,
  TextAreaField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  transferAssetFormSchema,
  type TransferAssetFormValues,
} from "../schemas";
import { useAssetFilterOptions, useTransferAsset } from "../hooks";
import { toTransferAssetPayload } from "../mappers";
import type { AssetResponse } from "../types";

type TransferAssetDialogProps = {
  asset: AssetResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TransferAssetDialog({
  asset,
  open,
  onOpenChange,
}: TransferAssetDialogProps) {
  const transferMutation = useTransferAsset();
  const { warehouseOptions } = useAssetFilterOptions();
  const form = useForm<TransferAssetFormValues>({
    resolver: zodResolver(transferAssetFormSchema),
    defaultValues: {
      toWarehouseId: "",
      transferDate: new Date().toISOString(),
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        toWarehouseId: "",
        transferDate: new Date().toISOString(),
        reason: "",
      });
    }
  }, [open, form]);

  if (!asset) {
    return null;
  }

  const destinationOptions = warehouseOptions.filter(
    (option) => option.id !== asset.warehouseId,
  );

  const handleSubmit = async (values: TransferAssetFormValues) => {
    await transferMutation.mutateAsync({
      id: asset.id,
      payload: toTransferAssetPayload(values),
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Transfer asset"
      description={`Move "${asset.assetCode}" to another warehouse.`}
      size="md"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          control={form.control}
          name="toWarehouseId"
          label="Destination warehouse"
          placeholder="Select warehouse"
          options={destinationOptions.map((option) => ({
            value: option.id,
            label: option.label,
          }))}
        />
        <DatePickerField
          control={form.control}
          name="transferDate"
          label="Transfer date"
        />
        <TextAreaField
          control={form.control}
          name="reason"
          label="Reason"
          placeholder="Optional"
        />
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={transferMutation.isPending}>
            Transfer
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
