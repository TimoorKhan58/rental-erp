"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { AppButton } from "@/components/design-system/button";
import { ROUTES } from "@/config/routes";
import { cn, pluralWord } from "@/lib/utils";
import { localDateInputValue } from "@/lib/utils/local-date";

import type { RentalOrderStatus } from "../types";

export type NextStepAction =
  | { kind: "confirm"; label: string }
  | { kind: "reserve"; label: string }
  | { kind: "link"; label: string; href: string };

export type NextStep = {
  title: string;
  text: string;
  tone: "normal" | "urgent" | "done";
  action?: NextStepAction;
};

function daysLate(endDate: string, today: string): number {
  const end = Date.parse(endDate.slice(0, 10));
  const now = Date.parse(today);
  return Math.max(0, Math.round((now - end) / 86_400_000));
}

/**
 * The one thing to do next on an order, in plain words (usability revamp R3).
 * `today` is the "YYYY-MM-DD" calendar day.
 */
export function getRentalOrderNextStep(
  order: { id: string; status: RentalOrderStatus; endDate: string },
  today: string = localDateInputValue(),
): NextStep {
  const forOrder = `?rentalOrderId=${order.id}`;
  switch (order.status) {
    case "DRAFT":
      return {
        title: "Confirm the order",
        text: "This order is a draft. Confirm it once the customer agrees.",
        tone: "normal",
        action: { kind: "confirm", label: "Confirm order" },
      };
    case "CONFIRMED":
      return {
        title: "Reserve the items",
        text: "Keep the stock aside for this customer so nobody else books it.",
        tone: "normal",
        action: { kind: "reserve", label: "Reserve items" },
      };
    case "RESERVED":
      return {
        title: "Send the items out",
        text: "The stock is kept aside. Create a dispatch when it leaves the warehouse.",
        tone: "normal",
        action: { kind: "link", label: "Create dispatch", href: `${ROUTES.dispatchesNew}${forOrder}` },
      };
    case "DISPATCHED":
    case "ON_RENT":
    case "PARTIALLY_RETURNED": {
      const late = daysLate(order.endDate, today);
      const partly = order.status === "PARTIALLY_RETURNED";
      return late > 0
        ? {
            title: `Late by ${late} ${pluralWord(late, "day")}`,
            text: "The items were due back. Call the customer, then record the return when they come in.",
            tone: "urgent",
            action: { kind: "link", label: "Record return", href: `${ROUTES.returnsNew}${forOrder}` },
          }
        : {
            title: partly ? "Waiting for the rest to come back" : "Out with the customer",
            text: partly
              ? "Some items are back. Record a return for the rest when they arrive."
              : "Record the return when the items come back.",
            tone: "normal",
            action: { kind: "link", label: "Record return", href: `${ROUTES.returnsNew}${forOrder}` },
          };
    }
    case "RETURNED":
      return {
        title: "Finish checking the returns",
        text: "Everything is back. Complete the return check so the order can be billed.",
        tone: "normal",
        action: { kind: "link", label: "Open returns", href: `${ROUTES.returns}${forOrder}` },
      };
    case "COMPLETED":
      return {
        title: "Bill the customer",
        text: "The rental is finished. Create the invoice or check its payment below.",
        tone: "done",
        action: { kind: "link", label: "Go to invoice", href: "#customer-invoice" },
      };
    case "CANCELLED":
    default:
      return { title: "Nothing more to do", text: "This order was cancelled.", tone: "done" };
  }
}

type RentalOrderNextStepProps = {
  step: NextStep;
  /** Whether the person may do the action; hides the button otherwise. */
  allowed: boolean;
  onConfirm: () => void;
  onReserve: () => void;
};

export function RentalOrderNextStep({ step, allowed, onConfirm, onReserve }: RentalOrderNextStepProps) {
  const action = allowed ? step.action : undefined;
  const icon = <ArrowRightIcon className="size-4" aria-hidden="true" />;
  return (
    <section
      aria-label="Next step"
      className={cn(
        "flex flex-col gap-3 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        step.tone === "urgent" ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5",
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next step</p>
        <p className={cn("text-base font-semibold", step.tone === "urgent" ? "text-destructive" : "text-foreground")}>
          {step.title}
        </p>
        <p className="text-sm text-muted-foreground">{step.text}</p>
      </div>
      {action?.kind === "link" ? (
        <AppButton className="shrink-0" rightIcon={icon} render={<Link href={action.href} />}>
          {action.label}
        </AppButton>
      ) : action ? (
        <AppButton className="shrink-0" rightIcon={icon} onClick={action.kind === "confirm" ? onConfirm : onReserve}>
          {action.label}
        </AppButton>
      ) : null}
    </section>
  );
}
