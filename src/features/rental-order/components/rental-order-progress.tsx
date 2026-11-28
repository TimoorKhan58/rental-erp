"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { RentalOrderStatus } from "../types";

export type ProgressStepState = "done" | "current" | "upcoming";

export type ProgressStep = {
  label: string;
  state: ProgressStepState;
};

/** Invoice statuses as the invoice API returns them. */
export type OrderInvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID";

const STEP_LABELS = ["Booked", "Sent out", "Back", "Invoiced", "Paid"] as const;

/**
 * Where an order is, in five steps a shop owner thinks in (UI redesign):
 * Booked → Sent out → Back → Invoiced → Paid. Returns the index of the
 * step being worked on; 5 means every step is done.
 */
export function currentProgressIndex(
  status: RentalOrderStatus,
  invoiceStatus: OrderInvoiceStatus | null,
): number {
  switch (status) {
    case "DRAFT":
      return 0;
    case "CONFIRMED":
    case "RESERVED":
      return 1;
    case "DISPATCHED":
    case "ON_RENT":
    case "PARTIALLY_RETURNED":
      return 2;
    case "RETURNED":
    case "COMPLETED":
      if (invoiceStatus === "PAID") return 5;
      if (invoiceStatus === "ISSUED" || invoiceStatus === "PARTIALLY_PAID") return 4;
      return 3;
    default:
      return 0;
  }
}

export function orderProgressSteps(
  status: RentalOrderStatus,
  invoiceStatus: OrderInvoiceStatus | null,
): ProgressStep[] {
  const current = currentProgressIndex(status, invoiceStatus);
  return STEP_LABELS.map((label, index) => ({
    label,
    state: index < current ? "done" : index === current ? "current" : "upcoming",
  }));
}

type RentalOrderProgressProps = {
  status: RentalOrderStatus;
  invoiceStatus: OrderInvoiceStatus | null;
  className?: string;
};

export function RentalOrderProgress({ status, invoiceStatus, className }: RentalOrderProgressProps) {
  if (status === "CANCELLED") {
    return (
      <div
        role="status"
        className={cn("rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground", className)}
      >
        This order was cancelled.
      </div>
    );
  }

  const steps = orderProgressSteps(status, invoiceStatus);

  return (
    <ol aria-label="Order progress" className={cn("grid grid-cols-5 gap-2", className)}>
      {steps.map((step) => (
        <li key={step.label} aria-current={step.state === "current" ? "step" : undefined} className="min-w-0 space-y-2">
          <span
            aria-hidden="true"
            className={cn(
              "block h-1.5 rounded-full",
              step.state === "done" && "bg-success",
              step.state === "current" && "bg-primary",
              step.state === "upcoming" && "bg-border",
            )}
          />
          <span
            className={cn(
              "flex items-center gap-1 truncate text-xs sm:text-sm",
              step.state === "current" ? "font-semibold text-foreground" : "font-medium",
              step.state === "done" && "text-foreground",
              step.state === "upcoming" && "text-muted-foreground",
            )}
          >
            {step.state === "done" ? (
              <CheckIcon className="size-3.5 shrink-0 text-success" aria-hidden="true" />
            ) : null}
            {step.label}
            {step.state === "done" ? <span className="sr-only"> (done)</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
