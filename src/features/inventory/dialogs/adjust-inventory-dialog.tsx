"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppModal } from "@/components/design-system/modal";
import { AppForm } from "@/components/forms";
import {
  NumberField,
  SelectField,
  TextAreaField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import {
  adjustInventoryFormSchema,
  type AdjustInventoryFormValues,
} from "../schemas";
import { useAdjustInventory } from "../hooks";
import type { InventoryResponse } from "../types";

type AdjustInventoryDialogProps = {
  inventory: InventoryResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdjustInventoryDialog({
  inventory,
  open,
  onOpenChange,
}: AdjustInventoryDialogProps) {
  const adjustMutation = useAdjustInventory();

  const form = useForm<AdjustInventoryFormValues>({
    resolver: zodResolver(adjustInventoryFormSchema),
    defaultValues: {
      direction: "increase",
      quantity: 1,
      remarks: "",
    },
  });

  const direction = form.watch("direction");
  const quantity = form.watch("quantity") || 0;

  useEffect(() => {
    if (open) {
      form.reset({
        direction: "increase",
        quantity: 1,
        remarks: "",
      });
    }
  }, [open, form]);

  if (!inventory) {
    return null;
  }

  const maxDecrease = Math.max(
    0,
    inventory.quantityOnHand - inventory.reservedQuantity,
  );
  const signedDelta =
    direction === "increase" ? quantity : -Math.abs(quantity);
  const previewOnHand = inventory.quantityOnHand + signedDelta;

  const handleSubmit = async (values: AdjustInventoryFormValues) => {
    if (values.direction === "decrease" && values.quantity > maxDecrease) {
      form.setError("quantity", {
        message: `Cannot decrease by more than ${maxDecrease} (must keep reserved stock covered)`,
      });
      return;
    }

    const delta =
      values.direction === "increase"
        ? values.quantity
        : -values.quantity;

    await adjustMutation.mutateAsync({
      inventoryId: inventory.id,
      quantity: delta,
      remarks: values.remarks,
    });
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust stock"
      description="Record a stock count correction. This creates an ADJUSTMENT movement and updates on-hand quantity."
      size="md"
    >
      <AppForm form={form} onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
          <p>
            On hand:{" "}
            <span className="font-medium tabular-nums">
              {inventory.quantityOnHand.toLocaleString()}
            </span>
          </p>
          <p className="text-muted-foreground">
            Reserved {inventory.reservedQuantity.toLocaleString()} · Available{" "}
            {inventory.availableQuantity.toLocaleString()}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="direction"
            label="Direction"
            options={[
              { value: "increase", label: "Increase" },
              { value: "decrease", label: "Decrease" },
            ]}
          />
          <NumberField
            control={form.control}
            name="quantity"
            label="Quantity"
            min={1}
            max={direction === "decrease" ? Math.max(maxDecrease, 1) : undefined}
            step={1}
          />
        </div>

        <TextAreaField
          control={form.control}
          name="remarks"
          label="Reason"
          description="e.g. Cycle count correction, damaged write-off, found stock"
          rows={3}
        />

        <p className="text-sm text-muted-foreground">
          New on hand after adjustment:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {Number.isFinite(previewOnHand) && previewOnHand >= 0
              ? previewOnHand.toLocaleString()
              : "—"}
          </span>
          {direction === "decrease" ? (
            <span className="block mt-1">
              Max decrease while covering reserved stock: {maxDecrease.toLocaleString()}
            </span>
          ) : null}
        </p>

        <div className="flex justify-end gap-2">
          <AppButton
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AppButton>
          <AppButton
            type="submit"
            loading={adjustMutation.isPending}
            disabled={direction === "decrease" && maxDecrease === 0}
          >
            Apply adjustment
          </AppButton>
        </div>
      </AppForm>
    </AppModal>
  );
}
