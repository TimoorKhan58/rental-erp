"use client";

import { useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { NumberField, SelectField, TextField } from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { formatCurrency } from "@/lib/utils";
import { LINE_TYPE_LABELS } from "../mappers";
import { RENTAL_INVOICE_LINE_TYPES } from "../types";
import type { CreateRentalInvoiceFormValues } from "../schemas";

const lineTypeOptions = RENTAL_INVOICE_LINE_TYPES.map((lineType) => ({
  value: lineType,
  label: LINE_TYPE_LABELS[lineType],
}));

const emptyLineItem = {
  lineType: "RENTAL_CHARGE" as const,
  description: "",
  quantity: 1,
  unitPrice: 0,
};

export function RentalInvoiceLineItemsField() {
  const form = useFormContext<CreateRentalInvoiceFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");

  const totals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    let tax = 0;

    for (const item of items ?? []) {
      const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
      if (item.lineType === "DISCOUNT") {
        discount += lineTotal;
      } else if (item.lineType === "TAX") {
        tax += lineTotal;
      } else {
        subtotal += lineTotal;
      }
    }

    return {
      subtotal,
      discount,
      tax,
      grandTotal: Math.max(0, subtotal - discount + tax),
    };
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium" scope="col">
                Type
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Description
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Qty
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Unit price
              </th>
              <th className="px-3 py-2 font-medium text-right" scope="col">
                Line total
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const line = items?.[index];
              const lineTotal = (line?.quantity || 0) * (line?.unitPrice || 0);

              return (
                <tr key={field.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 align-top">
                    <SelectField
                      control={form.control}
                      name={`items.${index}.lineType`}
                      label="Line type"
                      options={lineTypeOptions}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <TextField
                      control={form.control}
                      name={`items.${index}.description`}
                      label="Description"
                      placeholder="Line description"
                    />
                  </td>
                  <td className="w-28 px-3 py-2 align-top">
                    <NumberField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      label="Quantity"
                      min={1}
                      step={1}
                    />
                  </td>
                  <td className="w-36 px-3 py-2 align-top">
                    <NumberField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      label="Unit price"
                      min={0}
                      step={0.01}
                    />
                  </td>
                  <td className="px-3 py-2 text-right align-middle tabular-nums">
                    {formatCurrency(lineTotal)}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove line ${index + 1}`}
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2Icon className="size-4" aria-hidden="true" />
                    </AppButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AppButton
          type="button"
          variant="outline"
          leftIcon={<PlusIcon className="size-4" aria-hidden="true" />}
          onClick={() => append({ ...emptyLineItem })}
        >
          Add line
        </AppButton>

        <dl className="grid gap-1 text-sm tabular-nums sm:text-right">
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Discount</dt>
            <dd>{formatCurrency(totals.discount)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Tax</dt>
            <dd>{formatCurrency(totals.tax)}</dd>
          </div>
          <div className="flex justify-between gap-6 font-medium">
            <dt>Grand total</dt>
            <dd>{formatCurrency(totals.grandTotal)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
