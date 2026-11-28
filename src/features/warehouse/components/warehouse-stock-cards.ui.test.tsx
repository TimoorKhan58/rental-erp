import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { bookedShare, WarehouseStockCardsView } from "./warehouse-stock-cards";

const line = {
  warehouseId: "w1",
  warehouseCode: "WH-1",
  warehouseName: "Main godown",
  inventoryQuantity: 200,
  reservedQuantity: 50,
  availableQuantity: 150,
  inventoryValue: 0,
  productCount: 12,
  utilizationPercent: 25,
};

describe("WarehouseStockCardsView (UI redesign)", () => {
  it("shows free now first, then in stock and booked", () => {
    render(<WarehouseStockCardsView lines={[line]} />);
    expect(screen.getByText("Main godown")).toBeInTheDocument();
    expect(screen.getByText("12 items kept")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("free to rent now")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "25% of this stock is booked" })).toBeInTheDocument();
  });

  it("copes with an empty warehouse", () => {
    expect(bookedShare({ inventoryQuantity: 0, reservedQuantity: 0 })).toBe(0);
    expect(bookedShare({ inventoryQuantity: 10, reservedQuantity: 30 })).toBe(100);
  });
});
