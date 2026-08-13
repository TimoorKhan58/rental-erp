import { describe, expect, it } from "vitest";

import {
  calculateExternalSourcingShortfall,
  isSourceExternallyEligibleStatus,
} from "./rental-order.shortfall.rules";

describe("calculateExternalSourcingShortfall", () => {
  it("A: uses F-02 available as owned fulfillable (500 − 300 = 200)", () => {
    const result = calculateExternalSourcingShortfall({
      requiredQuantity: 500,
      dateAwareAvailableQuantity: 300,
    });

    expect(result).toEqual({
      requiredQuantity: 500,
      ownedFulfillableQuantity: 300,
      shortfallQuantity: 200,
      alreadyExternallyRequestedQuantity: 0,
      remainingShortfallQuantity: 200,
    });
  });

  it("B: no shortage when owned covers demand", () => {
    const result = calculateExternalSourcingShortfall({
      requiredQuantity: 100,
      dateAwareAvailableQuantity: 150,
    });

    expect(result.shortfallQuantity).toBe(0);
    expect(result.ownedFulfillableQuantity).toBe(100);
    expect(result.remainingShortfallQuantity).toBe(0);
  });

  it("C: remaining shortfall subtracts already externally requested", () => {
    const result = calculateExternalSourcingShortfall({
      requiredQuantity: 500,
      dateAwareAvailableQuantity: 300,
      alreadyExternallyRequestedQuantity: 50,
    });

    expect(result.shortfallQuantity).toBe(200);
    expect(result.remainingShortfallQuantity).toBe(150);
  });

  it("D: already requested beyond shortfall clamps remaining to 0", () => {
    const result = calculateExternalSourcingShortfall({
      requiredQuantity: 500,
      dateAwareAvailableQuantity: 300,
      alreadyExternallyRequestedQuantity: 250,
    });

    expect(result.remainingShortfallQuantity).toBe(0);
  });
});

describe("isSourceExternallyEligibleStatus", () => {
  it("allows DRAFT / CONFIRMED / RESERVED", () => {
    expect(isSourceExternallyEligibleStatus("DRAFT")).toBe(true);
    expect(isSourceExternallyEligibleStatus("CONFIRMED")).toBe(true);
    expect(isSourceExternallyEligibleStatus("RESERVED")).toBe(true);
  });

  it("rejects CANCELLED and post-dispatch statuses", () => {
    expect(isSourceExternallyEligibleStatus("CANCELLED")).toBe(false);
    expect(isSourceExternallyEligibleStatus("DISPATCHED")).toBe(false);
    expect(isSourceExternallyEligibleStatus("ON_RENT")).toBe(false);
    expect(isSourceExternallyEligibleStatus("COMPLETED")).toBe(false);
  });
});
