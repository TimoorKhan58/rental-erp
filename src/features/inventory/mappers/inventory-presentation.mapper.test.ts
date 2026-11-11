import { describe, expect, it } from "vitest";
import {
  deriveInventoryPresentationChips,
  deriveRelatedOperationalAttention,
  needsInventoryAttention,
  stockStatusPresentationLabel,
} from "./inventory-presentation.mapper";
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

describe("inventory presentation mapper", () => {
  it("labels in-stock as Available and adds Committed when reserved > 0", () => {
    const chips = deriveInventoryPresentationChips(
      inventory({ reservedQuantity: 3, availableQuantity: 7, quantityOnHand: 10 }),
    );

    expect(chips.map((chip) => chip.label)).toEqual(["Available", "Committed"]);
    expect(stockStatusPresentationLabel("in-stock")).toBe("Available");
  });

  it("labels low available as Shortage and out as Out", () => {
    expect(
      deriveInventoryPresentationChips(
        inventory({ availableQuantity: 1, minimumStock: 5, quantityOnHand: 1 }),
      ).map((chip) => chip.label),
    ).toEqual(["Shortage"]);

    expect(
      deriveInventoryPresentationChips(
        inventory({ availableQuantity: 0, quantityOnHand: 0 }),
      ).map((chip) => chip.label),
    ).toEqual(["Out"]);
  });

  it("flags attention for shortage, out, and inactive records", () => {
    expect(needsInventoryAttention(inventory({ availableQuantity: 0 }))).toBe(true);
    expect(
      needsInventoryAttention(inventory({ availableQuantity: 1, minimumStock: 5 })),
    ).toBe(true);
    expect(needsInventoryAttention(inventory({ isActive: false }))).toBe(true);
    expect(needsInventoryAttention(inventory({ availableQuantity: 20 }))).toBe(false);
  });

  it("derives related repair/maintenance attention from open statuses only", () => {
    const signals = deriveRelatedOperationalAttention({
      repairs: [
        { status: "PENDING" },
        { status: "COMPLETED" },
        { status: "IN_PROGRESS" },
      ],
      maintenances: [{ status: "SCHEDULED" }, { status: "CANCELLED" }],
    });

    expect(signals.map((signal) => signal.label)).toEqual([
      "2 open repairs",
      "1 open maintenance",
    ]);
  });
});
