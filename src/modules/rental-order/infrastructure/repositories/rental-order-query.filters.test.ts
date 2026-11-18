import { describe, expect, it } from "vitest";

import { RENTAL_ORDER_STAGE_STATUSES } from "@/modules/rental-order/domain/rental-order-stage";

import { mapRentalOrderFilter } from "./rental-order-query.filters";

describe("order list stage filter (usability revamp R3)", () => {
  it("turns a stage into a status list", () => {
    expect(mapRentalOrderFilter({ statusIn: RENTAL_ORDER_STAGE_STATUSES.upcoming })).toMatchObject({
      status: { in: ["CONFIRMED", "RESERVED"] },
    });
  });

  it("late means out with the customer and due back before today", () => {
    const today = new Date("2026-11-18T00:00:00.000Z");
    expect(
      mapRentalOrderFilter({ statusIn: RENTAL_ORDER_STAGE_STATUSES.late, returnBefore: today }),
    ).toMatchObject({
      status: { in: ["DISPATCHED", "ON_RENT", "PARTIALLY_RETURNED"] },
      expectedReturnDate: { lt: today },
    });
  });

  it("an exact status wins over the stage", () => {
    expect(mapRentalOrderFilter({ status: "DRAFT", statusIn: ["CANCELLED"] })).toMatchObject({ status: "DRAFT" });
  });
});
