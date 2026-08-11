import type { RentalOrderStatus } from "./rental-order.constants";
import { RentalOrderInvariantError } from "./rental-order.errors";

/**
 * F-02 date-aware availability: closed calendar-day period [start, end].
 * Compares UTC Y/M/D so @db.Date / ISO date-only values are not shifted by local TZ.
 */
export type AvailabilityPeriod = {
  startDate: Date;
  endDate: Date;
};

export type AvailabilityDispatchClaim = {
  status: string;
  quantity: number;
};

export type AvailabilityReturnClaim = {
  status: string;
  returnedQuantity: number;
};

/** Statuses that consume future date-aware capacity (≠ analytics Active Rentals). */
export const AVAILABILITY_COMMITMENT_STATUSES: readonly RentalOrderStatus[] = [
  "RESERVED",
  "ON_RENT",
  "PARTIALLY_RETURNED",
] as const;

/**
 * UTC calendar-day key for date-only comparison (no local timezone day shift).
 */
export function toUtcCalendarDay(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

/**
 * Validates an inclusive F-02 rental period.
 * start = end is valid (one calendar day). end < start is invalid.
 */
export function assertValidAvailabilityPeriod(period: AvailabilityPeriod): void {
  if (Number.isNaN(period.startDate.getTime()) || Number.isNaN(period.endDate.getTime())) {
    throw new RentalOrderInvariantError(
      "Availability period dates must be valid",
      "startDate",
    );
  }

  if (toUtcCalendarDay(period.endDate) < toUtcCalendarDay(period.startDate)) {
    throw new RentalOrderInvariantError(
      "End date cannot be before start date",
      "endDate",
    );
  }
}

/**
 * Inclusive calendar-day overlap:
 * startA <= endB AND startB <= endA
 */
export function availabilityPeriodsOverlap(
  a: AvailabilityPeriod,
  b: AvailabilityPeriod,
): boolean {
  assertValidAvailabilityPeriod(a);
  assertValidAvailabilityPeriod(b);

  const startA = toUtcCalendarDay(a.startDate);
  const endA = toUtcCalendarDay(a.endDate);
  const startB = toUtcCalendarDay(b.startDate);
  const endB = toUtcCalendarDay(b.endDate);

  return startA <= endB && startB <= endA;
}

/**
 * Whether a rental-order status participates in date-aware capacity commitment.
 * DISPATCHED is ephemeral / not lasting → false.
 * Distinct from analytics isActiveRentalStatus (CONFIRMED + RESERVED).
 */
export function isAvailabilityCommitmentStatus(
  status: RentalOrderStatus,
): boolean {
  return (AVAILABILITY_COMMITMENT_STATUSES as readonly string[]).includes(
    status,
  );
}

/**
 * Sum of dispatch item quantities that claim against line reservedQuantity.
 * READY / DISPATCHED / COMPLETED count; CANCELLED does not.
 */
export function sumNonCancelledDispatchClaims(
  dispatches: AvailabilityDispatchClaim[],
): number {
  let total = 0;

  for (const dispatch of dispatches) {
    if (dispatch.status === "CANCELLED") {
      continue;
    }

    total += dispatch.quantity;
  }

  return total;
}

/**
 * Sum of COMPLETED dispatch quantities (physical OUT).
 */
export function sumCompletedDispatchQuantities(
  dispatches: AvailabilityDispatchClaim[],
): number {
  let total = 0;

  for (const dispatch of dispatches) {
    if (dispatch.status !== "COMPLETED") {
      continue;
    }

    total += dispatch.quantity;
  }

  return total;
}

/**
 * Sum of COMPLETED return returnedQuantity.
 */
export function sumCompletedReturnQuantities(
  returns: AvailabilityReturnClaim[],
): number {
  let total = 0;

  for (const returnRecord of returns) {
    if (returnRecord.status !== "COMPLETED") {
      continue;
    }

    total += returnRecord.returnedQuantity;
  }

  return total;
}

export type CommitmentQuantityInput = {
  reservedQuantity: number;
  dispatches: AvailabilityDispatchClaim[];
  returns: AvailabilityReturnClaim[];
};

export type CommitmentQuantityBreakdown = {
  undispatchedHold: number;
  outstandingOut: number;
  commitmentQty: number;
};

/**
 * F-02 commitment quantity for one rental line (pure).
 *
 * undispatchedHold = max(0, reservedQuantity − non-CANCELLED dispatch claims)
 * outstandingOut   = max(0, COMPLETED dispatch qty − COMPLETED return qty)
 * commitmentQty    = undispatchedHold + outstandingOut
 *
 * Does not filter by order status — callers use isAvailabilityCommitmentStatus.
 */
export function calculateCommitmentQuantity(
  input: CommitmentQuantityInput,
): CommitmentQuantityBreakdown {
  const nonCancelledClaims = sumNonCancelledDispatchClaims(input.dispatches);
  const completedDispatchQty = sumCompletedDispatchQuantities(input.dispatches);
  const completedReturnQty = sumCompletedReturnQuantities(input.returns);

  const undispatchedHold = Math.max(
    0,
    input.reservedQuantity - nonCancelledClaims,
  );
  const outstandingOut = Math.max(
    0,
    completedDispatchQty - completedReturnQty,
  );

  return {
    undispatchedHold,
    outstandingOut,
    commitmentQty: undispatchedHold + outstandingOut,
  };
}

/**
 * One rental-order line projection used by F-02 date-aware availability aggregation.
 * Repository supplies these; domain remains persistence-free.
 */
export type AvailabilityCommitmentLine = {
  status: RentalOrderStatus;
  eventStartDate: Date;
  eventEndDate: Date;
  reservedQuantity: number;
  dispatches: AvailabilityDispatchClaim[];
  returns: AvailabilityReturnClaim[];
};

export type DateAwareAvailabilitySnapshotInput = {
  quantityOnHand: number;
  reservedQuantity: number;
  requestedPeriod: AvailabilityPeriod;
  /** Consuming-status lines for the same product × warehouse (unbounded; not paged). */
  lines: AvailabilityCommitmentLine[];
};

/**
 * Physical + date-aware availability snapshot (pure).
 *
 * baseCapacity = quantityOnHand + Σ outstandingOut (all consuming lines)
 * dateAwareCommitted = Σ commitmentQty of overlapping consuming lines
 * dateAwareAvailable = max(0, baseCapacity − dateAwareCommitted)
 *
 * Does not subtract timeless reservedQuantity a second time: outstandingOut
 * restores physically-out units into capacity; undispatchedHold remains in onHand.
 */
export type DateAwareAvailabilitySnapshot = {
  quantityOnHand: number;
  reservedQuantity: number;
  currentAvailableQuantity: number;
  outstandingOutQuantity: number;
  baseCapacity: number;
  dateAwareCommittedQuantity: number;
  dateAwareAvailableQuantity: number;
};

export function calculateDateAwareAvailabilitySnapshot(
  input: DateAwareAvailabilitySnapshotInput,
): DateAwareAvailabilitySnapshot {
  assertValidAvailabilityPeriod(input.requestedPeriod);

  if (
    !Number.isFinite(input.quantityOnHand) ||
    !Number.isFinite(input.reservedQuantity) ||
    input.quantityOnHand < 0 ||
    input.reservedQuantity < 0
  ) {
    throw new RentalOrderInvariantError(
      "Inventory quantities must be finite and non-negative",
      "quantityOnHand",
    );
  }

  let outstandingOutQuantity = 0;
  let dateAwareCommittedQuantity = 0;

  for (const line of input.lines) {
    if (!isAvailabilityCommitmentStatus(line.status)) {
      continue;
    }

    const breakdown = calculateCommitmentQuantity({
      reservedQuantity: line.reservedQuantity,
      dispatches: line.dispatches,
      returns: line.returns,
    });

    outstandingOutQuantity += breakdown.outstandingOut;

    const overlaps = availabilityPeriodsOverlap(input.requestedPeriod, {
      startDate: line.eventStartDate,
      endDate: line.eventEndDate,
    });

    if (overlaps) {
      dateAwareCommittedQuantity += breakdown.commitmentQty;
    }
  }

  const baseCapacity = input.quantityOnHand + outstandingOutQuantity;
  const dateAwareAvailableQuantity = Math.max(
    0,
    baseCapacity - dateAwareCommittedQuantity,
  );

  return {
    quantityOnHand: input.quantityOnHand,
    reservedQuantity: input.reservedQuantity,
    currentAvailableQuantity: input.quantityOnHand - input.reservedQuantity,
    outstandingOutQuantity,
    baseCapacity,
    dateAwareCommittedQuantity,
    dateAwareAvailableQuantity,
  };
}
