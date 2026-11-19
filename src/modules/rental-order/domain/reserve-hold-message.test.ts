import { describe, expect, it } from "vitest";

import type { ProductId, WarehouseId } from "@/shared/domain/ids";

import type { AvailabilityCommitmentLineProjection } from "./rental-order.availability.projection";
import type { RentalOrderStatus } from "./rental-order.constants";
import {
  describeHoldsOnOtherDates,
  findHoldsOnOtherDates,
} from "./reserve-hold-message";

function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function line(
  override: Partial<AvailabilityCommitmentLineProjection> & {
    rentalOrderId: string;
    reservedQuantity: number;
    eventStartDate: Date;
    eventEndDate: Date;
  },
): AvailabilityCommitmentLineProjection {
  return {
    rentalOrderItemId: crypto.randomUUID(),
    productId: "p" as ProductId,
    warehouseId: "w" as WarehouseId,
    status: "RESERVED" as RentalOrderStatus,
    dispatches: [],
    returns: [],
    ...override,
  };
}

const NEXT_WEEKEND = { startDate: d(2026, 11, 28), endDate: d(2026, 11, 29) };

describe("findHoldsOnOtherDates (AVL-03)", () => {
  it("lists orders holding stock on other dates, ending soonest first", () => {
    const holds = findHoldsOnOtherDates(NEXT_WEEKEND, [
      line({ rentalOrderId: "b", orderNumber: "RO-00020", reservedQuantity: 5, eventStartDate: d(2026, 12, 5), eventEndDate: d(2026, 12, 6) }),
      line({ rentalOrderId: "a", orderNumber: "RO-00012", reservedQuantity: 15, eventStartDate: d(2026, 11, 21), eventEndDate: d(2026, 11, 22) }),
    ]);

    expect(holds.map((hold) => [hold.orderNumber, hold.quantity])).toEqual([
      ["RO-00012", 15],
      ["RO-00020", 5],
    ]);
  });

  it("skips overlapping orders, items already sent out, and orders not holding stock", () => {
    const holds = findHoldsOnOtherDates(NEXT_WEEKEND, [
      line({ rentalOrderId: "overlap", reservedQuantity: 4, eventStartDate: d(2026, 11, 29), eventEndDate: d(2026, 11, 30) }),
      line({ rentalOrderId: "draft", status: "CONFIRMED" as RentalOrderStatus, reservedQuantity: 4, eventStartDate: d(2026, 12, 1), eventEndDate: d(2026, 12, 2) }),
      line({
        rentalOrderId: "sent",
        status: "ON_RENT" as RentalOrderStatus,
        reservedQuantity: 6,
        eventStartDate: d(2026, 11, 20),
        eventEndDate: d(2026, 11, 23),
        dispatches: [{ status: "COMPLETED", quantity: 6, ownedQuantity: 6 }],
      }),
    ]);

    expect(holds).toEqual([]);
  });

  it("adds up several lines of the same order", () => {
    const holds = findHoldsOnOtherDates(NEXT_WEEKEND, [
      line({ rentalOrderId: "a", reservedQuantity: 3, eventStartDate: d(2026, 11, 20), eventEndDate: d(2026, 11, 21) }),
      line({ rentalOrderId: "a", reservedQuantity: 2, eventStartDate: d(2026, 11, 20), eventEndDate: d(2026, 11, 23) }),
    ]);

    expect(holds).toHaveLength(1);
    expect(holds[0]?.quantity).toBe(5);
    expect(holds[0]?.heldUntil).toEqual(d(2026, 11, 23));
  });
});

describe("describeHoldsOnOtherDates (AVL-03)", () => {
  it("names the holding order, the date it frees up, and says the booking is safe", () => {
    const message = describeHoldsOnOtherDates({
      productName: "Tables",
      requestedQuantity: 15,
      bookableQuantity: 0,
      holds: [{ rentalOrderId: "a", orderNumber: "RO-00012", quantity: 15, heldUntil: d(2026, 11, 22) }],
    });

    expect(message).toBe(
      "None of the 15 Tables can be reserved now. The rest are held by bookings on other dates: 15 by RO-00012 until 22 Nov 2026. This order's booking for its own dates is safe. Reserve again after those items come back.",
    );
  });

  it("says how many can be reserved and shortens a long list", () => {
    const holds = ["1", "2", "3", "4", "5"].map((n) => ({
      rentalOrderId: n,
      orderNumber: `RO-0000${n}`,
      quantity: 1,
      heldUntil: d(2026, 11, 20 + Number(n)),
    }));

    const message = describeHoldsOnOtherDates({
      productName: undefined,
      requestedQuantity: 10,
      bookableQuantity: 5,
      holds,
    });

    expect(message).toContain("Only 5 of the 10 units can be reserved now.");
    expect(message).toContain("RO-00003 until 23 Nov 2026 and 2 more orders.");
    expect(message).not.toContain("RO-00004");
  });
});
