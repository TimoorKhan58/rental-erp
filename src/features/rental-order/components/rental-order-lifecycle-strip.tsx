"use client";

import { cn } from "@/lib/utils";
import type { RentalOrderStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

const STATUS_FLOW: RentalOrderStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "RESERVED",
  "DISPATCHED",
  "ON_RENT",
  "PARTIALLY_RETURNED",
  "RETURNED",
  "COMPLETED",
];

type RentalOrderLifecycleStripProps = {
  status: RentalOrderStatus;
  className?: string;
};

/**
 * Informational lifecycle strip using real domain statuses only.
 * Does not authorize or trigger transitions.
 */
export function RentalOrderLifecycleStrip({
  status,
  className,
}: RentalOrderLifecycleStripProps) {
  if (status === "CANCELLED") {
    return (
      <div
        className={cn(
          "rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
        role="status"
      >
        Order cancelled — lifecycle closed
      </div>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(status);

  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1",
        className,
      )}
      aria-label="Rental order lifecycle"
    >
      {STATUS_FLOW.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <li key={step} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span
                className={cn(
                  "hidden h-px w-3 sm:block",
                  isComplete || isCurrent ? "bg-primary/40" : "bg-border",
                )}
                aria-hidden="true"
              />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium whitespace-nowrap",
                isCurrent &&
                  "border-primary bg-primary text-primary-foreground",
                isComplete &&
                  "border-primary/25 bg-primary/8 text-primary",
                isUpcoming && "border-border bg-card text-muted-foreground",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
