import { describe, expect, it } from "vitest";
import { calculateInventoryRecovery } from "./inventory-recovery.mapper";

describe("calculateInventoryRecovery", () => {
  it("returns no cost data when purchase cost is missing", () => {
    const result = calculateInventoryRecovery({
      quantityOnHand: 100,
      reservedQuantity: 10,
      pricing: { replacementCost: null, rentalRate: "7" },
    });

    expect(result.hasCostData).toBe(false);
    expect(result.phaseLabel).toBe("No cost data");
  });

  it("calculates recovery from allocated rental revenue", () => {
    const result = calculateInventoryRecovery({
      quantityOnHand: 50,
      reservedQuantity: 0,
      pricing: { replacementCost: "1000", rentalRate: "7" },
      productRecovery: {
        revenue: 12000,
        quantityOnHand: 100,
      },
    });

    expect(result.hasCostData).toBe(true);
    expect(result.recoveredAmount).toBe(6000);
    expect(result.totalCost).toBe(50000);
    expect(result.percentage).toBe(12);
    expect(result.phaseLabel).toBe("Initial");
  });

  it("falls back to reserved quantity estimate when revenue is unavailable", () => {
    const result = calculateInventoryRecovery({
      quantityOnHand: 100,
      reservedQuantity: 10,
      pricing: { replacementCost: "1000", rentalRate: "7" },
    });

    expect(result.recoveredAmount).toBe(70);
    expect(result.percentage).toBeCloseTo(0.07, 5);
    expect(result.phaseLabel).toBe("Initial");
  });

  it("marks fully recovered products at break-even", () => {
    const result = calculateInventoryRecovery({
      quantityOnHand: 10,
      reservedQuantity: 0,
      pricing: { replacementCost: "100", rentalRate: "7" },
      productRecovery: {
        revenue: 1000,
        quantityOnHand: 10,
      },
    });

    expect(result.percentage).toBe(100);
    expect(result.phaseLabel).toBe("Break-even");
    expect(result.isOverRecovered).toBe(false);
    expect(result.surplusAmount).toBe(0);
  });

  it("marks over-recovered products beyond total cost", () => {
    const result = calculateInventoryRecovery({
      quantityOnHand: 10,
      reservedQuantity: 0,
      pricing: { replacementCost: "100", rentalRate: "7" },
      productRecovery: {
        revenue: 1500,
        quantityOnHand: 10,
      },
    });

    expect(result.percentage).toBe(150);
    expect(result.phaseLabel).toBe("Over recovered");
    expect(result.isOverRecovered).toBe(true);
    expect(result.surplusAmount).toBe(500);
  });
});
