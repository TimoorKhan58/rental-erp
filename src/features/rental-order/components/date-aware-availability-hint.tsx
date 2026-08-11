"use client";

import { useDateAwareAvailability } from "../hooks";

type DateAwareAvailabilityHintProps = {
  productId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  excludeRentalOrderId?: string;
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
    return null;
  }

  if (query.isLoading) {
    return (
      <p className={className ?? "text-xs text-muted-foreground"}>
        Checking availability for selected dates…
      </p>
    );
  }

  if (query.isError) {
    return (
      <p className={className ?? "text-xs text-destructive"}>
        Could not load date-aware availability.
      </p>
    );
  }

  if (!query.data) {
    return null;
  }

  return (
    <p className={className ?? "text-xs text-muted-foreground"}>
      Available for selected dates:{" "}
      <span className="font-medium text-foreground">
        {query.data.dateAwareAvailableQuantity}
      </span>
    </p>
  );
}
