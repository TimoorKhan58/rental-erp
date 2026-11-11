"use client";

import { useDateAwareAvailability } from "../hooks";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DateAwareAvailabilityHintProps = {
  productId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  excludeRentalOrderId?: string;
  /** Form line quantity — compared to API available for shortage display only. */
  requestedQuantity?: number;
  className?: string;
};

/**
 * Informational F-02 availability for selected product/warehouse/dates.
 * Reserve enforcement remains server-side in ReserveRentalOrderService.
 */
export function DateAwareAvailabilityHint({
  productId,
  warehouseId,
  startDate,
  endDate,
  excludeRentalOrderId,
  requestedQuantity,
  className,
}: DateAwareAvailabilityHintProps) {
  const query = useDateAwareAvailability({
    productId,
    warehouseId,
    startDate,
    endDate,
    excludeRentalOrderId,
  });

  if (!productId || !warehouseId || !startDate || !endDate) {
    return (
      <p className={cn("text-[length:var(--text-caption)] text-muted-foreground", className)}>
        Select product, warehouse, and dates to check availability.
      </p>
    );
  }

  if (query.isLoading) {
    return (
      <p className={cn("text-[length:var(--text-caption)] text-muted-foreground", className)}>
        Checking availability for selected dates…
      </p>
    );
  }

  if (query.isError) {
    return (
      <p className={cn("text-[length:var(--text-caption)] text-destructive", className)} role="alert">
        Could not load date-aware availability.
      </p>
    );
  }

  if (!query.data) {
    return null;
  }

  // Show the same limit the reserve step enforces (QA-009).
  const available =
    query.data.bookableQuantity ?? query.data.dateAwareAvailableQuantity;
  const heldForOtherDates = query.data.heldForOtherDatesQuantity ?? 0;
  const onHand = query.data.quantityOnHand;
  const committed = query.data.dateAwareCommittedQuantity;
  const outstandingOut = query.data.outstandingOutQuantity;
  const hasShortage =
    typeof requestedQuantity === "number" &&
    requestedQuantity > 0 &&
    available < requestedQuantity;

  const shortBy =
    hasShortage && typeof requestedQuantity === "number"
      ? Math.max(0, requestedQuantity - available)
      : 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-md border px-2.5 py-2",
        hasShortage
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-muted/20",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Badge variant={hasShortage ? "destructive" : "success"} className="tabular-nums">
        Available {available}
      </Badge>
      {hasShortage ? (
        <Badge variant="destructive" className="tabular-nums">
          Short by {shortBy}
        </Badge>
      ) : null}
      <Badge variant="outline" className="tabular-nums">
        On hand {onHand}
      </Badge>
      <Badge variant="secondary" className="tabular-nums">
        Committed {committed}
      </Badge>
      {outstandingOut > 0 ? (
        <Badge variant="warning" className="tabular-nums">
          Out {outstandingOut}
        </Badge>
      ) : null}
      {hasShortage ? (
        <span className="text-[length:var(--text-caption)] text-destructive">
          Requested {requestedQuantity}; only {available} available for these dates.
        </span>
      ) : (
        <span className="text-[length:var(--text-caption)] text-muted-foreground">
          For selected rental dates (authoritative)
        </span>
      )}
      {heldForOtherDates > 0 ? (
        <span className="w-full text-[length:var(--text-caption)] text-muted-foreground">
          {heldForOtherDates} more are free on these dates but held by bookings
          on other dates.
        </span>
      ) : null}
    </div>
  );
}
