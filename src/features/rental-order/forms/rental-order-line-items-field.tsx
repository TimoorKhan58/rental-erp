"use client";

import { useEffect, useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  CheckboxField,
  ComboboxField,
  DatePickerField,
  NumberField,
} from "@/components/design-system/form";
import { AppButton } from "@/components/design-system/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  calculateLineSubtotal,
  calculateOrderTotal,
  calculateRentalDays,
} from "../mappers";
import type { CreateRentalOrderFormValues } from "../schemas";

type RentalOrderLineItemsFieldProps = {
  productOptions: Array<{ id: string; label: string; keywords?: string }>;
  startDate?: string;
  endDate?: string;
  readOnly?: boolean;
};

function createEmptyLineItem(startDate: string, endDate: string) {
  return {
    productId: "",
    quantity: 1,
    dailyRate: 1,
    useCustomDates: false,
    startDate,
    endDate,
  };
}

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

  const orderStartDate = startDate ?? watchedStartDate;
  const orderEndDate = endDate ?? watchedEndDate;
  const defaultRentalDays = useMemo(() => {
    if (!orderStartDate || !orderEndDate) {
      return 1;
    }

    return calculateRentalDays(orderStartDate, orderEndDate);
  }, [orderStartDate, orderEndDate]);

  useEffect(() => {
    if (!orderStartDate || !orderEndDate || readOnly) {
      return;
    }

    const currentItems = form.getValues("items") ?? [];
    let changed = false;

    const nextItems = currentItems.map((item) => {
      if (item.useCustomDates) {
        return item;
      }

      if (item.startDate === orderStartDate && item.endDate === orderEndDate) {
        return item;
      }

      changed = true;
      return {
        ...item,
        startDate: orderStartDate,
        endDate: orderEndDate,
      };
    });

    if (changed) {
      form.setValue("items", nextItems, { shouldDirty: true });
    }
  }, [form, orderEndDate, orderStartDate, readOnly]);

  const orderTotal = useMemo(
    () => calculateOrderTotal(items ?? []),
    [items],
  );

  const selectOptions = productOptions.map((option) => ({
    value: option.id,
    label: option.label,
    keywords: option.keywords,
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Default rental window: {defaultRentalDays} day
        {defaultRentalDays === 1 ? "" : "s"}
        {orderStartDate && orderEndDate
          ? ` (${formatDate(orderStartDate)} – ${formatDate(orderEndDate)})`
          : ""}
        . Toggle custom dates per product when mehndi, barat, and walima need different periods.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium" scope="col">Product</th>
              <th className="px-3 py-2 font-medium" scope="col">Qty</th>
              <th className="px-3 py-2 font-medium" scope="col">Daily rate</th>
              <th className="px-3 py-2 font-medium" scope="col">Custom dates</th>
              <th className="px-3 py-2 font-medium" scope="col">Rental period</th>
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
              const lineDays =
                line?.startDate && line?.endDate
                  ? calculateRentalDays(line.startDate, line.endDate)
                  : defaultRentalDays;
              const subtotal = line ? calculateLineSubtotal(line) : 0;

              return (
                <tr key={field.id} className="border-b align-top last:border-b-0">
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span>
                        {selectOptions.find((option) => option.value === line?.productId)?.label ??
                          line?.productId ??
                          "—"}
                      </span>
                    ) : (
                      <ComboboxField
                        control={form.control}
                        name={`items.${index}.productId`}
                        label="Product"
                        placeholder="Select product"
                        searchPlaceholder="Search products..."
                        options={selectOptions}
                        className="min-w-52"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span>{line?.useCustomDates ? "Yes" : "Order default"}</span>
                    ) : (
                      <CheckboxField
                        control={form.control}
                        name={`items.${index}.useCustomDates`}
                        label="Custom dates"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly || !line?.useCustomDates ? (
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <p>{lineDays} day{lineDays === 1 ? "" : "s"}</p>
                        {line?.startDate && line?.endDate ? (
                          <p>
                            {formatDate(line.startDate)} – {formatDate(line.endDate)}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <DatePickerField
                          control={form.control}
                          name={`items.${index}.startDate`}
                          label="Start"
                        />
                        <DatePickerField
                          control={form.control}
                          name={`items.${index}.endDate`}
                          label="End"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(subtotal)}
                  </td>
                  {!readOnly ? (
                    <td className="px-3 py-2">
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
                colSpan={readOnly ? 5 : 6}
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
          onClick={() =>
            append(
              createEmptyLineItem(
                orderStartDate || new Date().toISOString(),
                orderEndDate ||
                  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              ),
            )
          }
        >
          Add line item
        </AppButton>
      ) : null}
    </div>
  );
}
