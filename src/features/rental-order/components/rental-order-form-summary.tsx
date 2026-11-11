"use client";

import { useFormContext } from "react-hook-form";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  calculateOrderTotal,
  calculateRentalDays,
} from "../mappers";
import type { CreateRentalOrderFormValues } from "../schemas";
import { AppButton } from "@/components/design-system/button";
import { Card, CardContent } from "@/components/ui/card";

type RentalOrderFormSummaryProps = {
  mode: "create" | "edit";
  orderNumber?: string;
  isSubmitting?: boolean;
  submitLabel: string;
  onCancel: () => void;
  customerLabel?: string;
  warehouseLabel?: string;
};

/**
 * Sticky operational summary — presents form values + existing line total helpers.
 * Does not invent pricing rules beyond calculateOrderTotal already used by the form.
 */
export function RentalOrderFormSummary({
  mode,
  orderNumber,
  isSubmitting = false,
  submitLabel,
  onCancel,
  customerLabel,
  warehouseLabel,
}: RentalOrderFormSummaryProps) {
  const form = useFormContext<CreateRentalOrderFormValues>();
  const values = form.watch();
  const items = values.items ?? [];
  const filledItems = items.filter((item) => Boolean(item.productId));
  const rentalDays =
    values.startDate && values.endDate
      ? calculateRentalDays(values.startDate, values.endDate)
      : 0;
  const orderTotal = calculateOrderTotal(items);
  const itemCount = filledItems.length;
  const unitCount = filledItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const steps = [
    {
      id: "customer",
      label: "Customer",
      done: Boolean(values.customerId && values.warehouseId),
    },
    {
      id: "dates",
      label: "Dates",
      done: Boolean(values.startDate && values.endDate),
    },
    {
      id: "inventory",
      label: "Inventory",
      done: filledItems.length > 0,
    },
    {
      id: "review",
      label: "Review",
      done: Boolean(values.customerId && values.warehouseId && filledItems.length > 0),
    },
  ];

  return (
    <>
      {/* Desktop sticky panel */}
      <Card className="hidden border-border lg:block">
        <CardContent className="space-y-4 p-4">
          <div>
            <p className="text-[length:var(--text-caption)] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Order summary
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {mode === "edit" && orderNumber ? orderNumber : "New rental order"}
            </p>
          </div>

          <ol className="space-y-1.5" aria-label="Form progress">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={
                    step.done
                      ? "flex size-5 items-center justify-center rounded-md bg-primary text-[10px] font-semibold text-primary-foreground"
                      : "flex size-5 items-center justify-center rounded-md border border-border text-[10px] font-semibold text-muted-foreground"
                  }
                >
                  {index + 1}
                </span>
                <span className={step.done ? "text-foreground" : "text-muted-foreground"}>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>

          <dl className="space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="max-w-[10rem] truncate text-right font-medium">
                {customerLabel || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Warehouse</dt>
              <dd className="max-w-[10rem] truncate text-right font-medium">
                {warehouseLabel || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Period</dt>
              <dd className="text-right font-medium tabular-nums">
                {rentalDays > 0 ? `${rentalDays} day${rentalDays === 1 ? "" : "s"}` : "—"}
              </dd>
            </div>
            {values.startDate && values.endDate ? (
              <p className="text-right text-[length:var(--text-caption)] text-muted-foreground">
                {formatDate(values.startDate)} – {formatDate(values.endDate)}
              </p>
            ) : null}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Lines</dt>
              <dd className="font-medium tabular-nums">
                {itemCount} · {unitCount} units
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-border pt-2">
              <dt className="font-medium">Estimated total</dt>
              <dd className="font-heading text-lg font-semibold tabular-nums">
                {formatCurrency(orderTotal)}
              </dd>
            </div>
            <p className="text-[length:var(--text-caption)] text-muted-foreground">
              From line qty × daily rate × rental days (form preview).
            </p>
          </dl>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <AppButton
              type="submit"
              loading={isSubmitting}
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {submitLabel}
            </AppButton>
            <AppButton type="button" variant="outline" className="w-full" onClick={onCancel}>
              Cancel
            </AppButton>
          </div>
        </CardContent>
      </Card>

      {/* Mobile compact bar */}
      <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-border bg-card p-3 lg:hidden">
        <div className="mx-auto flex w-full max-w-none items-center gap-3 px-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[length:var(--text-caption)] text-muted-foreground">
              {itemCount} lines · {rentalDays || "—"} days
            </p>
            <p className="font-heading text-base font-semibold tabular-nums">
              {formatCurrency(orderTotal)}
            </p>
          </div>
          <AppButton type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </AppButton>
          <AppButton
            type="submit"
            size="sm"
            loading={isSubmitting}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {submitLabel}
          </AppButton>
        </div>
      </div>
    </>
  );
}
