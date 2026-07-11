"use client";

import { useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { NumberField, SelectField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { formatCurrency } from "@/lib/utils";
import { calculateLineSubtotal, calculateOrderTotal } from "../mappers";
import type { CreateProcurementFormValues } from "../schemas";

type ProcurementLineItemsFieldProps = {
  productOptions: Array<{ id: string; label: string }>;
  readOnly?: boolean;
};

const emptyLineItem = {
  productId: "",
  quantity: 1,
  unitCost: 0,
};

export function ProcurementLineItemsField({
  productOptions,
  readOnly = false,
}: ProcurementLineItemsFieldProps) {
  const form = useFormContext<CreateProcurementFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");
  const orderTotal = useMemo(() => calculateOrderTotal(items ?? []), [items]);

  const selectOptions = productOptions.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium" scope="col">
                Product
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Quantity
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Unit cost
              </th>
              <th className="px-3 py-2 font-medium text-right" scope="col">
                Subtotal
              </th>
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
              const subtotal = line ? calculateLineSubtotal(line) : 0;

              return (
                <tr key={field.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <span>
                        {selectOptions.find((option) => option.value === line?.productId)?.label ??
                          line?.productId ??
                          "—"}
                      </span>
                    ) : (
                      <SelectField
                        control={form.control}
                        name={`items.${index}.productId`}
                        label="Product"
                        placeholder="Select product"
                        options={selectOptions}
                        className="min-w-48"
                      />
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
                        step={1}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <span>{line ? formatCurrency(line.unitCost) : "—"}</span>
                    ) : (
                      <NumberField
                        control={form.control}
                        name={`items.${index}.unitCost`}
                        label="Unit cost"
                        min={0}
                        step={0.01}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right align-top font-medium">
                    {formatCurrency(subtotal)}
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
          <tfoot>
            <tr className="bg-muted/20">
              <td
                colSpan={readOnly ? 3 : 4}
                className="px-3 py-2 text-right font-medium"
              >
                Order total
              </td>
              <td className="px-3 py-2 text-right font-semibold">
                {formatCurrency(orderTotal)}
              </td>
              {!readOnly ? <td /> : null}
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly ? (
        <AppButton
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
          onClick={() => append(emptyLineItem)}
        >
          Add line item
        </AppButton>
      ) : null}
    </div>
  );
}
