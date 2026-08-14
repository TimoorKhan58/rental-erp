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
      description={`Record condition for "${returnRecord.returnNumber}". Mixed-source lines require owned and external GOOD/DAMAGED/LOST attribution.`}
      size="lg"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        {form.watch("items").map((item, index) => {
          const requiresSourceCondition = form.watch(
            `items.${index}.requiresSourceCondition`,
          );
          const ownedGood = form.watch(`items.${index}.ownedGoodQuantity`) ?? 0;
          const ownedDamaged =
            form.watch(`items.${index}.ownedDamagedQuantity`) ?? 0;
          const ownedLost = form.watch(`items.${index}.ownedLostQuantity`) ?? 0;
          const externalGood =
            form.watch(`items.${index}.externalGoodQuantity`) ?? 0;
          const externalDamaged =
            form.watch(`items.${index}.externalDamagedQuantity`) ?? 0;
          const externalLost =
            form.watch(`items.${index}.externalLostQuantity`) ?? 0;

          return (
            <div key={item.rentalOrderItemId} className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-medium">
                {rentalOrderItemLabelById.get(item.rentalOrderItemId) ??
                  item.rentalOrderItemId}
                <span className="ml-2 text-muted-foreground">
                  (Returned: {item.returnedQuantity}
                  {item.ownedQuantity != null && item.externalQuantity != null
                    ? ` · owned ${item.ownedQuantity} / external ${item.externalQuantity}`
                    : ""}
                  )
                </span>
              </p>

              {requiresSourceCondition ? (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Owned condition
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <NumberField
                        control={form.control}
                        name={`items.${index}.ownedGoodQuantity`}
                        label="Owned good"
                        min={0}
                      />
                      <NumberField
                        control={form.control}
                        name={`items.${index}.ownedDamagedQuantity`}
                        label="Owned damaged"
                        min={0}
                      />
                      <NumberField
                        control={form.control}
                        name={`items.${index}.ownedLostQuantity`}
                        label="Owned lost"
                        min={0}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      External condition
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <NumberField
                        control={form.control}
                        name={`items.${index}.externalGoodQuantity`}
                        label="External good"
                        min={0}
                      />
                      <NumberField
                        control={form.control}
                        name={`items.${index}.externalDamagedQuantity`}
                        label="External damaged"
                        min={0}
                      />
                      <NumberField
                        control={form.control}
                        name={`items.${index}.externalLostQuantity`}
                        label="External lost"
                        min={0}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Totals — good {ownedGood + externalGood}, damaged{" "}
                    {ownedDamaged + externalDamaged}, lost{" "}
                    {ownedLost + externalLost}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  <NumberField
                    control={form.control}
                    name={`items.${index}.missingQuantity`}
                    label="Missing"
                    min={0}
                  />
                </div>
              )}

              <TextField
                control={form.control}
                name={`items.${index}.notes`}
                label="Condition notes"
                className="mt-3"
              />
            </div>
          );
        })}

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
