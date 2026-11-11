import { describe, expect, it } from "vitest";
import {
  deriveStockStatus,
  matchesStockStatusFilter,
  resolveInventoryRowAccentClass,
} from "./inventory-stock.mapper";
import type { InventoryResponse } from "../types";

function inventory(partial: Partial<InventoryResponse>): InventoryResponse {
  return {
    id: "inv-1",
    productId: "p-1",
    warehouseId: "w-1",
    quantityOnHand: 10,
    reservedQuantity: 0,
    availableQuantity: 10,
    minimumStock: 2,
    maximumStock: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("deriveStockStatus", () => {
  it("returns out-of-stock when availableQuantity is zero or negative", () => {
    expect(deriveStockStatus(inventory({ availableQuantity: 0 }))).toBe("out-of-stock");
    expect(deriveStockStatus(inventory({ availableQuantity: -1 }))).toBe("out-of-stock");
  });

  it("returns low-stock when available is below or at minimum threshold", () => {
    expect(
      deriveStockStatus(inventory({ availableQuantity: 2, minimumStock: 5 })),
    ).toBe("low-stock");
    expect(
      deriveStockStatus(inventory({ availableQuantity: 5, minimumStock: 5 })),
    ).toBe("low-stock");
  });

  it("returns overstock only when quantityOnHand exceeds maximumStock", () => {
    expect(
      deriveStockStatus(
        inventory({ quantityOnHand: 12, availableQuantity: 12, maximumStock: 10 }),
      ),
    ).toBe("overstock");
    expect(
      deriveStockStatus(
        inventory({ quantityOnHand: 10, availableQuantity: 10, maximumStock: 10 }),
      ),
    ).toBe("in-stock");
  });

  it("returns in-stock when available exceeds minimum and does not overshoot maximum", () => {
    expect(deriveStockStatus(inventory({ availableQuantity: 20 }))).toBe("in-stock");
  });
});

describe("matchesStockStatusFilter", () => {
  it("passes every row through when filter is undefined or 'all'", () => {
    const row = inventory({ availableQuantity: 0 });
    expect(matchesStockStatusFilter(row, undefined)).toBe(true);
    expect(matchesStockStatusFilter(row, "all")).toBe(true);
  });

  it("matches only rows whose derived status equals the filter", () => {
    expect(
      matchesStockStatusFilter(inventory({ availableQuantity: 0 }), "out-of-stock"),
    ).toBe(true);
    expect(
      matchesStockStatusFilter(inventory({ availableQuantity: 0 }), "in-stock"),
    ).toBe(false);
  });
});

/**
 * Regression: desktop table and mobile list must render the same left-accent
 * class for the same row. See INV-01 (Module 3 Inventory Super QA).
 */
describe("resolveInventoryRowAccentClass", () => {
  it("returns destructive for out-of-stock rows", () => {
    expect(
      resolveInventoryRowAccentClass(inventory({ availableQuantity: 0 })),
    ).toBe("border-l-destructive");
  });

  it("returns warning for low-stock rows", () => {
    expect(
      resolveInventoryRowAccentClass(
        inventory({ availableQuantity: 2, minimumStock: 5 }),
      ),
    ).toBe("border-l-warning");
  });

  it("returns muted for inactive rows whose stock is otherwise fine", () => {
    expect(
      resolveInventoryRowAccentClass(
        inventory({ availableQuantity: 20, minimumStock: 2, isActive: false }),
      ),
    ).toBe("border-l-muted-foreground/40");
  });

  it("prefers destructive over inactive when both apply", () => {
    expect(
      resolveInventoryRowAccentClass(
        inventory({ availableQuantity: 0, isActive: false }),
      ),
    ).toBe("border-l-destructive");
  });

  it("returns transparent for stock-ok active rows", () => {
    expect(resolveInventoryRowAccentClass(inventory({}))).toBe(
      "border-l-transparent",
    );
  });
});
