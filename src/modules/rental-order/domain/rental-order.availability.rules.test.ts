import { describe, expect, it } from "vitest";

import {
  availabilityPeriodsOverlap,
  assertValidAvailabilityPeriod,
  calculateCommitmentQuantity,
  calculateDateAwareAvailabilitySnapshot,
  isAvailabilityCommitmentStatus,
  toUtcCalendarDay,
  type AvailabilityCommitmentLine,
} from "./rental-order.availability.rules";
import { RentalOrderInvariantError } from "./rental-order.errors";

/** Build a UTC calendar-date Date (avoids local TZ day shift). */
function d(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

describe("toUtcCalendarDay", () => {
  it("compares date-only UTC components", () => {
    expect(toUtcCalendarDay(d(2026, 6, 10))).toBe(
      Date.UTC(2026, 5, 10),
    );
  });
});

describe("assertValidAvailabilityPeriod", () => {
  it("accepts start before end", () => {
    expect(() =>
      assertValidAvailabilityPeriod({
        startDate: d(2026, 6, 10),
        endDate: d(2026, 6, 15),
      }),
    ).not.toThrow();
  });

  it("accepts start equal to end (one calendar day)", () => {
    expect(() =>
      assertValidAvailabilityPeriod({
        startDate: d(2026, 6, 10),
        endDate: d(2026, 6, 10),
      }),
    ).not.toThrow();
  });

  it("rejects end before start", () => {
    expect(() =>
      assertValidAvailabilityPeriod({
        startDate: d(2026, 6, 15),
        endDate: d(2026, 6, 10),
      }),
    ).toThrow(RentalOrderInvariantError);
  });
});

describe("availabilityPeriodsOverlap (inclusive [start, end])", () => {
  const jun10_15 = {
    startDate: d(2026, 6, 10),
    endDate: d(2026, 6, 15),
  };

  it("same period → overlap", () => {
    expect(availabilityPeriodsOverlap(jun10_15, jun10_15)).toBe(true);
  });

  it("same start → overlap", () => {
    expect(
      availabilityPeriodsOverlap(jun10_15, {
        startDate: d(2026, 6, 10),
        endDate: d(2026, 6, 12),
      }),
    ).toBe(true);
  });

  it("same end → overlap", () => {
    expect(
      availabilityPeriodsOverlap(jun10_15, {
        startDate: d(2026, 6, 12),
        endDate: d(2026, 6, 15),
      }),
    ).toBe(true);
  });

  it("A contained in B → overlap", () => {
    expect(
      availabilityPeriodsOverlap(
        { startDate: d(2026, 6, 11), endDate: d(2026, 6, 13) },
        jun10_15,
      ),
    ).toBe(true);
  });

  it("B contained in A → overlap", () => {
    expect(
      availabilityPeriodsOverlap(jun10_15, {
        startDate: d(2026, 6, 11),
        endDate: d(2026, 6, 13),
      }),
    ).toBe(true);
  });

  it("partial overlap from left → overlap", () => {
    expect(
      availabilityPeriodsOverlap(
        { startDate: d(2026, 6, 8), endDate: d(2026, 6, 12) },
        jun10_15,
      ),
    ).toBe(true);
  });

  it("partial overlap from right → overlap", () => {
    expect(
      availabilityPeriodsOverlap(jun10_15, {
        startDate: d(2026, 6, 14),
        endDate: d(2026, 6, 20),
      }),
    ).toBe(true);
  });

  it("same-day periods → overlap", () => {
    const day = {
      startDate: d(2026, 6, 10),
      endDate: d(2026, 6, 10),
    };
    expect(availabilityPeriodsOverlap(day, day)).toBe(true);
  });

  it("adjacent periods Jun 10–15 and Jun 16–20 → no overlap", () => {
    expect(
      availabilityPeriodsOverlap(jun10_15, {
        startDate: d(2026, 6, 16),
        endDate: d(2026, 6, 20),
      }),
    ).toBe(false);
  });

  it("shared boundary Jun 10–15 and Jun 15–20 → overlap", () => {
    expect(
      availabilityPeriodsOverlap(jun10_15, {
        startDate: d(2026, 6, 15),
        endDate: d(2026, 6, 20),
      }),
    ).toBe(true);
  });

  it("completely separate → no overlap", () => {
    expect(
      availabilityPeriodsOverlap(jun10_15, {
        startDate: d(2026, 6, 20),
        endDate: d(2026, 6, 25),
      }),
    ).toBe(false);
  });

  it("is symmetric", () => {
    const a = jun10_15;
    const b = {
      startDate: d(2026, 6, 15),
      endDate: d(2026, 6, 20),
    };
    const c = {
      startDate: d(2026, 6, 16),
      endDate: d(2026, 6, 20),
    };

    expect(availabilityPeriodsOverlap(a, b)).toBe(
      availabilityPeriodsOverlap(b, a),
    );
    expect(availabilityPeriodsOverlap(a, c)).toBe(
      availabilityPeriodsOverlap(c, a),
    );
  });
});

describe("isAvailabilityCommitmentStatus", () => {
  it("returns true for RESERVED, ON_RENT, PARTIALLY_RETURNED", () => {
    expect(isAvailabilityCommitmentStatus("RESERVED")).toBe(true);
    expect(isAvailabilityCommitmentStatus("ON_RENT")).toBe(true);
    expect(isAvailabilityCommitmentStatus("PARTIALLY_RETURNED")).toBe(true);
  });

  it("returns false for non-consuming and ephemeral statuses", () => {
    expect(isAvailabilityCommitmentStatus("DRAFT")).toBe(false);
    expect(isAvailabilityCommitmentStatus("CONFIRMED")).toBe(false);
    expect(isAvailabilityCommitmentStatus("DISPATCHED")).toBe(false);
    expect(isAvailabilityCommitmentStatus("RETURNED")).toBe(false);
    expect(isAvailabilityCommitmentStatus("COMPLETED")).toBe(false);
    expect(isAvailabilityCommitmentStatus("CANCELLED")).toBe(false);
  });
});

describe("calculateCommitmentQuantity", () => {
  it("A: reservation only → 100", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [],
      returns: [],
    });

    expect(result).toEqual({
      undispatchedHold: 100,
      outstandingOut: 0,
      commitmentQty: 100,
    });
  });

  it("B: reserved 100 + dispatch 60 → commitment 100", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "COMPLETED", quantity: 60 }],
      returns: [],
    });

    expect(result).toEqual({
      undispatchedHold: 40,
      outstandingOut: 60,
      commitmentQty: 100,
    });
  });

  it("external-only COMPLETED dispatch does not inflate outstandingOut", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 60,
      dispatches: [
        {
          status: "COMPLETED",
          quantity: 100,
          ownedQuantity: 60,
        },
      ],
      returns: [],
    });

    expect(result).toEqual({
      undispatchedHold: 0,
      outstandingOut: 60,
      commitmentQty: 60,
    });
  });

  it("owned return claim ignores external returned quantity", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 60,
      dispatches: [
        {
          status: "COMPLETED",
          quantity: 100,
          ownedQuantity: 60,
        },
      ],
      returns: [
        {
          status: "COMPLETED",
          returnedQuantity: 100,
          ownedReturnedQuantity: 50,
        },
      ],
    });

    expect(result.outstandingOut).toBe(10);
    expect(result.commitmentQty).toBe(10);
  });

  it("C: full dispatch → commitment 100", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "COMPLETED", quantity: 100 }],
      returns: [],
    });

    expect(result).toEqual({
      undispatchedHold: 0,
      outstandingOut: 100,
      commitmentQty: 100,
    });
  });

  it("D: full dispatch + return 40 → commitment 60", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "COMPLETED", quantity: 100 }],
      returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
    });

    expect(result).toEqual({
      undispatchedHold: 0,
      outstandingOut: 60,
      commitmentQty: 60,
    });
  });

  it("E: full dispatch + return 100 → commitment 0", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "COMPLETED", quantity: 100 }],
      returns: [{ status: "COMPLETED", returnedQuantity: 100 }],
    });

    expect(result).toEqual({
      undispatchedHold: 0,
      outstandingOut: 0,
      commitmentQty: 0,
    });
  });

  it("F: multi-dispatch 60+40 + return 40 → commitment 60", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [
        { status: "COMPLETED", quantity: 60 },
        { status: "COMPLETED", quantity: 40 },
      ],
      returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
    });

    expect(result).toEqual({
      undispatchedHold: 0,
      outstandingOut: 60,
      commitmentQty: 60,
    });
  });

  it("G: cancelled dispatch ignored → commitment 100", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [
        { status: "COMPLETED", quantity: 60 },
        { status: "CANCELLED", quantity: 20 },
      ],
      returns: [],
    });

    expect(result).toEqual({
      undispatchedHold: 40,
      outstandingOut: 60,
      commitmentQty: 100,
    });
  });

  it("H: return > dispatch clamps outstandingOut → commitment 50", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "COMPLETED", quantity: 50 }],
      returns: [{ status: "COMPLETED", returnedQuantity: 70 }],
    });

    expect(result).toEqual({
      undispatchedHold: 50,
      outstandingOut: 0,
      commitmentQty: 50,
    });
  });

  it("I: zero reservation → commitment 0", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 0,
      dispatches: [],
      returns: [],
    });

    expect(result).toEqual({
      undispatchedHold: 0,
      outstandingOut: 0,
      commitmentQty: 0,
    });
  });

  it("J: dispatch claims exceed reserved → undispatchedHold clamps to 0", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "COMPLETED", quantity: 120 }],
      returns: [],
    });

    expect(result.undispatchedHold).toBe(0);
    expect(result.outstandingOut).toBe(120);
    expect(result.commitmentQty).toBe(120);
  });

  it("READY and DISPATCHED dispatches count toward undispatchedHold claim", () => {
    const ready = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "READY", quantity: 30 }],
      returns: [],
    });
    expect(ready).toEqual({
      undispatchedHold: 70,
      outstandingOut: 0,
      commitmentQty: 70,
    });

    const dispatched = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "DISPATCHED", quantity: 25 }],
      returns: [],
    });
    expect(dispatched).toEqual({
      undispatchedHold: 75,
      outstandingOut: 0,
      commitmentQty: 75,
    });
  });

  it("READY does not contribute to outstandingOut", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "READY", quantity: 40 }],
      returns: [],
    });

    expect(result.outstandingOut).toBe(0);
    expect(result.commitmentQty).toBe(60);
  });

  it("non-COMPLETED returns do not reduce outstandingOut", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "COMPLETED", quantity: 100 }],
      returns: [{ status: "DRAFT", returnedQuantity: 40 }],
    });

    expect(result.outstandingOut).toBe(100);
    expect(result.commitmentQty).toBe(100);
  });

  it("sums multiple completed returns", () => {
    const result = calculateCommitmentQuantity({
      reservedQuantity: 100,
      dispatches: [{ status: "COMPLETED", quantity: 100 }],
      returns: [
        { status: "COMPLETED", returnedQuantity: 25 },
        { status: "COMPLETED", returnedQuantity: 15 },
      ],
    });

    expect(result.outstandingOut).toBe(60);
    expect(result.commitmentQty).toBe(60);
  });

  it("does not filter by order status (status predicate is separate)", () => {
    // Quantity function ignores order status entirely.
    const result = calculateCommitmentQuantity({
      reservedQuantity: 50,
      dispatches: [],
      returns: [],
    });
    expect(result.commitmentQty).toBe(50);
    expect(isAvailabilityCommitmentStatus("CONFIRMED")).toBe(false);
  });
});

describe("calculateDateAwareAvailabilitySnapshot (A–T matrix)", () => {
  const request = {
    startDate: d(2026, 1, 10),
    endDate: d(2026, 1, 20),
  };

  function line(
    override: Partial<AvailabilityCommitmentLine> & {
      reservedQuantity: number;
      status?: AvailabilityCommitmentLine["status"];
    },
  ): AvailabilityCommitmentLine {
    return {
      status: override.status ?? "RESERVED",
      eventStartDate: override.eventStartDate ?? d(2026, 1, 12),
      eventEndDate: override.eventEndDate ?? d(2026, 1, 18),
      reservedQuantity: override.reservedQuantity,
      dispatches: override.dispatches ?? [],
      returns: override.returns ?? [],
    };
  }

  function snap(
    lines: AvailabilityCommitmentLine[],
    inventory = { quantityOnHand: 200, reservedQuantity: 0 },
    period = request,
  ) {
    return calculateDateAwareAvailabilitySnapshot({
      ...inventory,
      requestedPeriod: period,
      lines,
    });
  }

  it("A: no overlapping rental → commitment = 0", () => {
    const result = snap([
      line({
        reservedQuantity: 100,
        eventStartDate: d(2026, 2, 1),
        eventEndDate: d(2026, 2, 5),
      }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(0);
    expect(result.dateAwareAvailableQuantity).toBe(200);
  });

  it("B: one RESERVED order reserved=100 overlapping → commitment = 100", () => {
    const result = snap([line({ reservedQuantity: 100 })]);
    expect(result.dateAwareCommittedQuantity).toBe(100);
    expect(result.dateAwareAvailableQuantity).toBe(100);
  });

  it("C: CONFIRMED order ignored → commitment = 0", () => {
    const result = snap([
      line({ status: "CONFIRMED", reservedQuantity: 100 }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(0);
  });

  it("D: CANCELLED order ignored → commitment = 0", () => {
    const result = snap([
      line({ status: "CANCELLED", reservedQuantity: 100 }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(0);
  });

  it("E: ON_RENT fully dispatched → commitment = 100", () => {
    const result = snap([
      line({
        status: "ON_RENT",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 100 }],
      }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(100);
    expect(result.outstandingOutQuantity).toBe(100);
    // onHand already reduced; baseCapacity restores OUT units
    expect(
      snap(
        [
          line({
            status: "ON_RENT",
            reservedQuantity: 100,
            dispatches: [{ status: "COMPLETED", quantity: 100 }],
          }),
        ],
        { quantityOnHand: 100, reservedQuantity: 100 },
      ),
    ).toMatchObject({
      baseCapacity: 200,
      dateAwareCommittedQuantity: 100,
      dateAwareAvailableQuantity: 100,
    });
  });

  it("F: ON_RENT partially returned → commitment = 60", () => {
    const result = snap([
      line({
        status: "ON_RENT",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 100 }],
        returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
      }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(60);
  });

  it("G: fully returned / completed status → commitment = 0", () => {
    expect(
      snap([
        line({
          status: "RETURNED",
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 100 }],
          returns: [{ status: "COMPLETED", returnedQuantity: 100 }],
        }),
      ]).dateAwareCommittedQuantity,
    ).toBe(0);

    expect(
      snap([
        line({
          status: "COMPLETED",
          reservedQuantity: 100,
          dispatches: [{ status: "COMPLETED", quantity: 100 }],
          returns: [{ status: "COMPLETED", returnedQuantity: 100 }],
        }),
      ]).dateAwareCommittedQuantity,
    ).toBe(0);
  });

  it("H: partial dispatch → commitment = 100 (60 out + 40 hold)", () => {
    const result = snap([
      line({
        status: "ON_RENT",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 60 }],
      }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(100);
  });

  it("I: partial dispatch + partial return → commitment = 80", () => {
    const result = snap([
      line({
        status: "ON_RENT",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 60 }],
        returns: [{ status: "COMPLETED", returnedQuantity: 20 }],
      }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(80);
  });

  it("J: multiple overlapping orders → commitment = 90", () => {
    const result = snap([
      line({ reservedQuantity: 40 }),
      line({ reservedQuantity: 30 }),
      line({ reservedQuantity: 20 }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(90);
  });

  it("K: non-overlapping orders excluded", () => {
    const result = snap([
      line({
        reservedQuantity: 40,
        eventStartDate: d(2026, 3, 1),
        eventEndDate: d(2026, 3, 5),
      }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(0);
  });

  it("N: CANCELLED dispatch does not consume undispatched hold", () => {
    const result = snap([
      line({
        reservedQuantity: 100,
        dispatches: [{ status: "CANCELLED", quantity: 100 }],
      }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(100);
  });

  it("O: mixed READY + COMPLETED claims", () => {
    const result = snap([
      line({
        status: "ON_RENT",
        reservedQuantity: 100,
        dispatches: [
          { status: "READY", quantity: 40 },
          { status: "COMPLETED", quantity: 60 },
        ],
      }),
    ]);
    // undispatchedHold=0, outstandingOut=60 → commitment=60
    expect(result.dateAwareCommittedQuantity).toBe(60);
  });

  it("P: multiple dispatches 60+40 → commitment 100 until returns", () => {
    const result = snap([
      line({
        status: "ON_RENT",
        reservedQuantity: 100,
        dispatches: [
          { status: "COMPLETED", quantity: 60 },
          { status: "COMPLETED", quantity: 40 },
        ],
      }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(100);
  });

  it("Q: return 40 after full dispatch → commitment = 60", () => {
    const result = snap([
      line({
        status: "PARTIALLY_RETURNED",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 100 }],
        returns: [{ status: "COMPLETED", returnedQuantity: 40 }],
      }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(60);
  });

  it("R: return all 100 → commitment = 0", () => {
    const result = snap([
      line({
        status: "PARTIALLY_RETURNED",
        reservedQuantity: 100,
        dispatches: [{ status: "COMPLETED", quantity: 100 }],
        returns: [{ status: "COMPLETED", returnedQuantity: 100 }],
      }),
    ]);
    expect(result.dateAwareCommittedQuantity).toBe(0);
  });

  it("S: requested single-day period overlaps correctly", () => {
    const result = snap(
      [
        line({
          reservedQuantity: 25,
          eventStartDate: d(2026, 1, 15),
          eventEndDate: d(2026, 1, 20),
        }),
      ],
      { quantityOnHand: 100, reservedQuantity: 0 },
      { startDate: d(2026, 1, 15), endDate: d(2026, 1, 15) },
    );
    expect(result.dateAwareCommittedQuantity).toBe(25);
  });

  it("T: boundary overlap inclusive (shared end day)", () => {
    const result = snap(
      [
        line({
          reservedQuantity: 10,
          eventStartDate: d(2026, 1, 10),
          eventEndDate: d(2026, 1, 15),
        }),
      ],
      { quantityOnHand: 100, reservedQuantity: 0 },
      { startDate: d(2026, 1, 15), endDate: d(2026, 1, 20) },
    );
    expect(result.dateAwareCommittedQuantity).toBe(10);

    const adjacent = snap(
      [
        line({
          reservedQuantity: 10,
          eventStartDate: d(2026, 1, 10),
          eventEndDate: d(2026, 1, 15),
        }),
      ],
      { quantityOnHand: 100, reservedQuantity: 0 },
      { startDate: d(2026, 1, 16), endDate: d(2026, 1, 20) },
    );
    expect(adjacent.dateAwareCommittedQuantity).toBe(0);
  });

  it("does not double-count timeless reserved against date-aware capacity", () => {
    // 100 on hand, 40 timeless reserved (undispatched hold still in warehouse)
    const result = snap(
      [line({ reservedQuantity: 40 })],
      { quantityOnHand: 100, reservedQuantity: 40 },
    );
    expect(result.currentAvailableQuantity).toBe(60);
    expect(result.baseCapacity).toBe(100);
    expect(result.dateAwareCommittedQuantity).toBe(40);
    expect(result.dateAwareAvailableQuantity).toBe(60);
  });
});
