"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { NumberField, TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import type { CreateReturnFormValues } from "../schemas";

type ReturnLineItemsFieldProps = {
  itemLabelById: Map<string, string>;
  readOnly?: boolean;
};

export function ReturnLineItemsField({
  itemLabelById,
  readOnly = false,
}: ReturnLineItemsFieldProps) {
  const form = useFormContext<CreateReturnFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No returned items added yet.</p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const rentalOrderItemId = form.watch(`items.${index}.rentalOrderItemId`);
            const maxQuantity = form.watch(`items.${index}.maxQuantity`);

            return (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_120px_1fr_auto]"
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Item
                  </p>
                  <p className="text-sm font-medium">
                    {itemLabelById.get(rentalOrderItemId) ?? (rentalOrderItemId || "—")}
                  </p>
                </div>

                <NumberField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  label="Quantity"
                  min={1}
                  max={maxQuantity}
                  disabled={readOnly}
                  description={
                    maxQuantity !== undefined ? `Max: ${maxQuantity}` : undefined
                  }
                />

                <TextField
                  control={form.control}
                  name={`items.${index}.notes`}
                  label="Notes"
                  disabled={readOnly}
                />

                {!readOnly && fields.length > 1 ? (
                  <div className="flex items-end">
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove item"
                      onClick={() => remove(index)}
                    >
                      <Trash2Icon className="size-4" aria-hidden="true" />
                    </AppButton>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly ? (
        <AppButton
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
          onClick={() =>
            append({
              rentalOrderItemId: "",
              dispatchItemId: "",
              quantity: 1,
              notes: "",
            })
          }
        >
          Add item
        </AppButton>
      ) : null}
    </div>
  );
}
