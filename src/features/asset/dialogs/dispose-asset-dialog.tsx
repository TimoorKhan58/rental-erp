"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import {
  DatePickerField,
  NumberField,
  TextAreaField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  disposeAssetFormSchema,
  type DisposeAssetFormValues,
} from "../schemas";
import { useDisposeAsset } from "../hooks";
import { toDisposeAssetPayload } from "../mappers";
import type { AssetResponse } from "../types";

type DisposeAssetDialogProps = {
  asset: AssetResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DisposeAssetDialog({
  asset,
  open,
  onOpenChange,
}: DisposeAssetDialogProps) {
  const disposeMutation = useDisposeAsset();
  const form = useForm<DisposeAssetFormValues>({
    resolver: zodResolver(disposeAssetFormSchema),
    defaultValues: {
      disposalDate: new Date().toISOString(),
      disposalAmount: undefined,
      disposalReason: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        disposalDate: new Date().toISOString(),
        disposalAmount: undefined,
        disposalReason: "",
      });
    }
  }, [open, form]);

  if (!asset) {
    return null;
  }

  const handleSubmit = async (values: DisposeAssetFormValues) => {
    await disposeMutation.mutateAsync({
      id: asset.id,
      payload: toDisposeAssetPayload(values),
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Dispose asset"
      description={`Permanently dispose "${asset.assetCode}". This cannot be undone.`}
      size="md"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <DatePickerField
          control={form.control}
          name="disposalDate"
          label="Disposal date"
        />
        <NumberField
          control={form.control}
          name="disposalAmount"
          label="Disposal amount"
          min={0}
          step={0.01}
          description="Optional proceeds from disposal"
        />
        <TextAreaField
          control={form.control}
          name="disposalReason"
          label="Reason"
          placeholder="Why is this asset being disposed?"
        />
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton
            type="submit"
            variant="destructive"
            loading={disposeMutation.isPending}
          >
            Dispose asset
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
