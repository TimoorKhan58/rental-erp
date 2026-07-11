"use client";

import { useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { NumberField, SelectField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { formatCurrency } from "@/lib/utils";
import { calculateLineSubtotal, calculateOrderTotal, calculateRentalDays } from "../mappers";
import type { CreateRentalOrderFormValues } from "../schemas";

type RentalOrderLineItemsFieldProps = {
  productOptions: Array<{ id: string; label: string }>;
  startDate?: string;
  endDate?: string;
  readOnly?: boolean;
};

const emptyLineItem = {
  productId: "",
  quantity: 1,
  dailyRate: 1,
};

export function RentalOrderLineItemsField({
  productOptions,
  startDate,
  endDate,
  readOnly = false,
}: RentalOrderLineItemsFieldProps) {
  const form = useFormContext<CreateRentalOrderFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");
  const items = form.watch("items");

  const rentalDays = useMemo(() => {
    const start = startDate ?? watchedStartDate;
    const end = endDate ?? watchedEndDate;

    if (!start || !end) {
      return 1;
    }

    return calculateRentalDays(start, end);
  }, [startDate, endDate, watchedStartDate, watchedEndDate]);

  const orderTotal = useMemo(
    () => calculateOrderTotal(items ?? [], rentalDays),
    [items, rentalDays],
  );

  const selectOptions = productOptions.map((option) => ({
    value: option.id,
    label: option.label,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rental period: {rentalDays} day{rentalDays === 1 ? "" : "s"}
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium" scope="col">Product</th>
              <th className="px-3 py-2 font-medium" scope="col">Quantity</th>
              <th className="px-3 py-2 font-medium" scope="col">Daily rate</th>
              <th className="px-3 py-2 font-medium text-right" scope="col">Subtotal</th>
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
              const subtotal = line ? calculateLineSubtotal(line, rentalDays) : 0;

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
                      <span>{line ? formatCurrency(line.dailyRate) : "—"}</span>
                    ) : (
                      <NumberField
                        control={form.control}
                        name={`items.${index}.dailyRate`}
                        label="Daily rate"
                        min={0.01}
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
