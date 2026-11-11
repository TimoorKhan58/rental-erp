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
import { DateAwareAvailabilityHint } from "../components/date-aware-availability-hint";

type RentalOrderLineItemsFieldProps = {
  productOptions: Array<{ id: string; label: string; keywords?: string }>;
  startDate?: string;
  endDate?: string;
  readOnly?: boolean;
  excludeRentalOrderId?: string;
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
  excludeRentalOrderId,
}: RentalOrderLineItemsFieldProps) {
  const form = useFormContext<CreateRentalOrderFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");
  const warehouseId = form.watch("warehouseId");
  const items = form.watch("items");
  const itemsError = form.formState.errors.items;
  const itemsRootError =
    itemsError && typeof itemsError === "object" && "message" in itemsError
      ? String(itemsError.message ?? "")
      : itemsError?.root?.message;

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

  const orderTotal = useMemo(() => calculateOrderTotal(items ?? []), [items]);

  const selectOptions = productOptions.map((option) => ({
    value: option.id,
    label: option.label,
    keywords: option.keywords,
  }));

  return (
    <div className="space-y-3">
      <p className="text-[length:var(--text-caption)] text-muted-foreground">
        Default window: {defaultRentalDays} day{defaultRentalDays === 1 ? "" : "s"}
        {orderStartDate && orderEndDate
          ? ` (${formatDate(orderStartDate)} – ${formatDate(orderEndDate)})`
          : ""}
        . Enable custom dates per line when events need different periods.
      </p>

      {itemsRootError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {itemsRootError}
        </p>
      ) : null}

      <div className="space-y-2">
        {fields.map((field, index) => {
          const line = items?.[index];
          const lineDays =
            line?.startDate && line?.endDate
              ? calculateRentalDays(line.startDate, line.endDate)
              : defaultRentalDays;
          const subtotal = line ? calculateLineSubtotal(line) : 0;

          return (
            <div
              key={field.id}
              className="rounded-md border border-border bg-card p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[length:var(--text-caption)] font-semibold tracking-wide text-muted-foreground uppercase">
                  Line {index + 1}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(subtotal)}
                  </p>
                  {!readOnly ? (
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      aria-label={`Remove line item ${index + 1}`}
                      title={
                        fields.length <= 1
                          ? "An order must have at least one line item"
                          : `Remove line item ${index + 1}`
                      }
                    >
                      <Trash2Icon className="size-4" />
                    </AppButton>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2.5">
                {readOnly ? (
                  <p className="text-sm font-medium">
                    {selectOptions.find((option) => option.value === line?.productId)?.label ??
                      line?.productId ??
                      "—"}
                  </p>
                ) : (
                  <ComboboxField
                    control={form.control}
                    name={`items.${index}.productId`}
                    label="Product"
                    placeholder="Search and select product"
                    searchPlaceholder="Search products..."
                    options={selectOptions}
                  />
                )}

                <DateAwareAvailabilityHint
                  productId={line?.productId}
                  warehouseId={warehouseId}
                  startDate={line?.startDate}
                  endDate={line?.endDate}
                  excludeRentalOrderId={excludeRentalOrderId}
                  requestedQuantity={line?.quantity}
                />

                <div className="grid gap-2 sm:grid-cols-3">
                  {readOnly ? (
                    <>
                      <div>
                        <p className="text-[length:var(--text-caption)] text-muted-foreground">Qty</p>
                        <p className="text-sm tabular-nums">{line?.quantity ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[length:var(--text-caption)] text-muted-foreground">Daily rate</p>
                        <p className="text-sm tabular-nums">
                          {line ? formatCurrency(line.dailyRate) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[length:var(--text-caption)] text-muted-foreground">Days</p>
                        <p className="text-sm tabular-nums">{lineDays}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <NumberField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        label="Quantity"
                        min={1}
                        step={1}
                      />
                      <NumberField
                        control={form.control}
                        name={`items.${index}.dailyRate`}
                        label="Daily rate"
                        min={0.01}
                        step={0.01}
                      />
                      <div className="flex flex-col justify-end pb-1">
                        <p className="text-[length:var(--text-caption)] text-muted-foreground">Days</p>
                        <p className="text-sm font-medium tabular-nums">{lineDays}</p>
                      </div>
                    </>
                  )}
                </div>

                {readOnly ? (
                  <p className="text-[length:var(--text-caption)] text-muted-foreground">
                    {line?.useCustomDates ? "Custom dates" : "Order default"}
                    {line?.startDate && line?.endDate
                      ? ` · ${formatDate(line.startDate)} – ${formatDate(line.endDate)}`
                      : ""}
                  </p>
                ) : (
                  <>
                    <CheckboxField
                      control={form.control}
                      name={`items.${index}.useCustomDates`}
                      label="Custom dates for this line"
                    />
                    {!line?.useCustomDates ? (
                      <p className="text-[length:var(--text-caption)] text-muted-foreground">
                        Using order dates
                        {line?.startDate && line?.endDate
                          ? `: ${formatDate(line.startDate)} – ${formatDate(line.endDate)}`
                          : ""}
                      </p>
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
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2.5">
        <span className="text-sm font-medium">Line items total</span>
        <span className="font-heading text-base font-semibold tabular-nums">
          {formatCurrency(orderTotal)}
        </span>
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
