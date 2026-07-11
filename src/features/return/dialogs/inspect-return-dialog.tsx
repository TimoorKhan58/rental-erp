"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import { NumberField, TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { toInspectFormValues, toInspectReturnPayload } from "../mappers";
import { useInspectReturn, useReturnFilterOptions } from "../hooks";
import {
  inspectReturnFormSchema,
  type InspectReturnFormValues,
} from "../schemas";
import type { ReturnResponse } from "../types";

type InspectReturnDialogProps = {
  returnRecord: ReturnResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InspectReturnDialog({
  returnRecord,
  open,
  onOpenChange,
}: InspectReturnDialogProps) {
  const inspectMutation = useInspectReturn();
  const { rentalOrderItemLabelById } = useReturnFilterOptions();

  const form = useForm<InspectReturnFormValues>({
    resolver: zodResolver(inspectReturnFormSchema),
    defaultValues: { items: [] },
  });

  useEffect(() => {
    if (!returnRecord || !open) {
      return;
    }

    form.reset(toInspectFormValues(returnRecord));
  }, [returnRecord, open, form]);

  if (!returnRecord) {
    return null;
  }

  const handleSubmit = async (values: InspectReturnFormValues) => {
    await inspectMutation.mutateAsync({
      id: returnRecord.id,
      payload: toInspectReturnPayload(values),
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Inspect returned items"
      description={`Record condition assessment for "${returnRecord.returnNumber}". Good, damaged, and lost quantities must sum to the returned quantity for each item.`}
      size="lg"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        {form.watch("items").map((item, index) => (
          <div key={item.rentalOrderItemId} className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-medium">
              {rentalOrderItemLabelById.get(item.rentalOrderItemId) ??
                item.rentalOrderItemId}
              <span className="ml-2 text-muted-foreground">
                (Returned: {item.returnedQuantity})
              </span>
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                control={form.control}
                name={`items.${index}.goodQuantity`}
                label="Good"
                min={0}
              />
              <NumberField
                control={form.control}
                name={`items.${index}.damagedQuantity`}
                label="Damaged"
                min={0}
              />
              <NumberField
                control={form.control}
                name={`items.${index}.lostQuantity`}
                label="Lost"
                min={0}
              />
            </div>
            <TextField
              control={form.control}
              name={`items.${index}.notes`}
              label="Damage notes"
              className="mt-3"
            />
          </div>
        ))}

        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </AppButton>
          <AppButton type="submit" loading={inspectMutation.isPending}>
            Save inspection
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
