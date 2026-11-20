import type { AvailabilityCommitmentLineProjection } from "./rental-order.availability.projection";
import {
  availabilityPeriodsOverlap,
  calculateCommitmentQuantity,
  isAvailabilityCommitmentStatus,
  type AvailabilityPeriod,
} from "./rental-order.availability.rules";

/** One other order whose reservation blocks a reserve for different dates. */
export type HoldOnOtherDates = {
  rentalOrderId: string;
  orderNumber: string | undefined;
  quantity: number;
  heldUntil: Date;
};

/**
 * Orders that hold units (reserved, not yet sent out) for dates that do NOT
 * overlap the requested period. Reservations sit in one pool per product and
 * warehouse, so these holds still limit a new reservation (AVL-03).
 * Sorted so the hold that ends first comes first.
 */
export function findHoldsOnOtherDates(
  requestedPeriod: AvailabilityPeriod,
  lines: AvailabilityCommitmentLineProjection[],
): HoldOnOtherDates[] {
  const byOrder = new Map<string, HoldOnOtherDates>();

  for (const line of lines) {
    if (!isAvailabilityCommitmentStatus(line.status)) {
      continue;
    }

    const overlaps = availabilityPeriodsOverlap(requestedPeriod, {
      startDate: line.eventStartDate,
      endDate: line.eventEndDate,
    });

    if (overlaps) {
      continue;
    }

    const { undispatchedHold } = calculateCommitmentQuantity({
      reservedQuantity: line.reservedQuantity,
      dispatches: line.dispatches,
      returns: line.returns,
    });

    if (undispatchedHold <= 0) {
      continue;
    }

    const existing = byOrder.get(line.rentalOrderId);

    if (existing === undefined) {
      byOrder.set(line.rentalOrderId, {
        rentalOrderId: line.rentalOrderId,
        orderNumber: line.orderNumber,
        quantity: undispatchedHold,
        heldUntil: line.eventEndDate,
      });
    } else {
      existing.quantity += undispatchedHold;
      if (line.eventEndDate > existing.heldUntil) {
        existing.heldUntil = line.eventEndDate;
      }
    }
  }

  return Array.from(byOrder.values()).sort(
    (left, right) => left.heldUntil.getTime() - right.heldUntil.getTime(),
  );
}

/** Calendar day stored as UTC midnight, shown as "24 Nov 2026". */
function formatCalendarDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const MAX_ORDERS_NAMED = 3;

/**
 * Plain-words refusal for a reserve blocked only by holds on other dates.
 * Says what can be reserved now, which orders hold the rest and until when,
 * and that the booking itself is safe.
 */
export function describeHoldsOnOtherDates(input: {
  productName: string | undefined;
  requestedQuantity: number;
  bookableQuantity: number;
  holds: HoldOnOtherDates[];
}): string {
  // Item names are not turned into plurals ("300 Foam Chair" read badly and
  // many names are Urdu), so the name goes first: "Foam Chair: only 200 of 300…".
  const prefix = input.productName ? `${input.productName}: ` : "";
  const units = input.productName ? "" : " units";
  const canReserve =
    input.bookableQuantity > 0
      ? `${prefix}${input.productName ? "only" : "Only"} ${input.bookableQuantity} of the ${input.requestedQuantity}${units} can be reserved now.`
      : `${prefix}${input.productName ? "none" : "None"} of the ${input.requestedQuantity}${units} can be reserved now.`;

  const named = input.holds.slice(0, MAX_ORDERS_NAMED).map((hold) => {
    const order = hold.orderNumber ?? "another order";
    return `${hold.quantity} by ${order} until ${formatCalendarDay(hold.heldUntil)}`;
  });
  const others = input.holds.length - named.length;
  const heldBy =
    named.length === 0
      ? "The rest are held by bookings on other dates."
      : `The rest are held by bookings on other dates: ${named.join(", ")}${
          others > 0 ? ` and ${others} more order${others === 1 ? "" : "s"}` : ""
        }.`;

  return `${canReserve} ${heldBy} This order's booking for its own dates is safe. Reserve again after those items come back.`;
}
