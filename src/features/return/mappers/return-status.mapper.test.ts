import { describe, expect, it } from "vitest";

import {
  isRentalOrderEligibleForReturnCreate,
  STATUS_LABELS,
} from "./return-status.mapper";
import { getReturnDamageTotals } from "./return-summary.mapper";
import type { ReturnResponse } from "../types";

const returnRecord: ReturnResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  returnNumber: "RET-1001",
  rentalOrderId: "00000000-0000-4000-8000-000000000002",
  dispatchId: "00000000-0000-4000-8000-000000000003",
  returnDate: "2026-09-12",
  remarks: null,
  status: "INSPECTED",
  receivedAt: "2026-09-12T00:00:00.000Z",
  inspectedAt: "2026-09-12T01:00:00.000Z",
  completedAt: null,
  items: [
    {
      id: "00000000-0000-4000-8000-000000000004",
      rentalOrderItemId: "00000000-0000-4000-8000-000000000005",
      dispatchItemId: null,
      returnedQuantity: 10,
      ownedQuantity: 10,
      externalQuantity: 0,
      goodQuantity: 6,
      damagedQuantity: 2,
      lostQuantity: 1,
      missingQuantity: 1,
      ownedGoodQuantity: 6,
      ownedDamagedQuantity: 2,
      ownedLostQuantity: 1,
      externalGoodQuantity: 0,
      externalDamagedQuantity: 0,
      externalLostQuantity: 0,
      notes: null,
    },
  ],
  createdById: "00000000-0000-4000-8000-000000000007",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("return status presentation", () => {
  it("keeps return workflow labels unchanged", () => {
    expect(STATUS_LABELS.DRAFT).toBe("Draft");
    expect(STATUS_LABELS.COMPLETED).toBe("Completed");
  });

  it("shows create-return CTA for orders that can still have outstanding dispatched qty", () => {
    expect(isRentalOrderEligibleForReturnCreate("ON_RENT")).toBe(true);
    expect(isRentalOrderEligibleForReturnCreate("PARTIALLY_RETURNED")).toBe(true);
    expect(isRentalOrderEligibleForReturnCreate("RETURNED")).toBe(true);
    expect(isRentalOrderEligibleForReturnCreate("DISPATCHED")).toBe(true);
  });

  it("does not treat RETURN_PENDING as a rental-order status", () => {
    expect(isRentalOrderEligibleForReturnCreate("RETURN_PENDING")).toBe(false);
    expect(isRentalOrderEligibleForReturnCreate("COMPLETED")).toBe(false);
    expect(isRentalOrderEligibleForReturnCreate("CANCELLED")).toBe(false);
  });
});

describe("getReturnDamageTotals", () => {
  it("includes missing quantity in inspection totals", () => {
    expect(getReturnDamageTotals(returnRecord)).toEqual({
      good: 6,
      damaged: 2,
      lost: 1,
      missing: 1,
    });
  });
});
