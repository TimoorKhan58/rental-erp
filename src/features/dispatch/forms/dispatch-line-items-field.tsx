"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { NumberField, TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import type { CreateDispatchFormValues } from "../schemas";

type DispatchLineItemsFieldProps = {
  productLabelById: Map<string, string>;
  readOnly?: boolean;
};

export function DispatchLineItemsField({
  productLabelById,
  readOnly = false,
}: DispatchLineItemsFieldProps) {
  const form = useFormContext<CreateDispatchFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium" scope="col">Product</th>
              <th className="px-3 py-2 font-medium" scope="col">Quantity</th>
              <th className="px-3 py-2 font-medium" scope="col">Notes</th>
              {!readOnly ? (
                <th className="px-3 py-2 font-medium" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const line = items?.[index];

              return (
                <tr key={field.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <span>
                        {productLabelById.get(line?.productId ?? "") ?? line?.productId ?? "—"}
                      </span>
                    ) : (
                      <span className="text-sm">
                        {productLabelById.get(line?.productId ?? "") ?? line?.productId ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <span>{line?.quantity ?? "—"}</span>
                    ) : (
                      <NumberField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        label="Quantity"
                        min={1}
                        max={line?.maxQuantity}
                        step={1}
                        description={
                          line?.maxQuantity !== undefined
                            ? `Max reserved: ${line.maxQuantity}`
                            : undefined
                        }
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <span>{line?.notes || "—"}</span>
                    ) : (
                      <TextField
                        control={form.control}
                        name={`items.${index}.notes`}
                        label="Notes"
                      />
                    )}
                  </td>
                  {!readOnly ? (
                    <td className="px-3 py-2 align-top">
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        aria-label={`Remove line item ${index + 1}`}
                      >
                        <Trash2Icon className="size-4" />
                      </AppButton>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <AppButton
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
          onClick={() =>
            append({
              productId: "",
              rentalOrderItemId: "",
              quantity: 1,
              notes: "",
            })
          }
        >
          Add line item
        </AppButton>
      ) : null}
    </div>
  );
}
