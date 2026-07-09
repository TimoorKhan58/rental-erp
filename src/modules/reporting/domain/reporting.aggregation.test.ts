import { describe, expect, it } from "vitest";

import {
  average,
  calculateAvailableQuantity,
  calculateInventoryValue,
  calculateRentalDurationDays,
  isLowStock,
  isOverstock,
  roundMoney,
} from "./reporting.rules";

describe("dashboard inventory aggregation", () => {
  it("sums inventory value across rows", () => {
    const rows = [
      { quantityOnHand: 50, purchaseCost: 25 },
      { quantityOnHand: 3, purchaseCost: 100 },
      { quantityOnHand: 120, purchaseCost: 25 },
    ];

    const totalValue = roundMoney(
      rows.reduce(
        (sum, row) =>
          sum + calculateInventoryValue(row.quantityOnHand, row.purchaseCost),
        0,
      ),
    );

    expect(totalValue).toBe(4550);
  });

  it("computes available quantity from totals", () => {
    const inventoryQuantity = 173;
    const reservedQuantity = 30;
    expect(calculateAvailableQuantity(inventoryQuantity, reservedQuantity)).toBe(
      143,
    );
  });

  it("counts low stock rows", () => {
    const rows = [
      { quantityOnHand: 50, minimumStock: 5 },
      { quantityOnHand: 3, minimumStock: 5 },
      { quantityOnHand: 120, minimumStock: 10 },
    ];
    expect(
      rows.filter((row) => isLowStock(row.quantityOnHand, row.minimumStock))
        .length,
    ).toBe(1);
  });

  it("counts overstock rows", () => {
    const rows = [
      { quantityOnHand: 50, maximumStock: 100 },
      { quantityOnHand: 120, maximumStock: 100 },
    ];
    expect(
      rows.filter((row) => isOverstock(row.quantityOnHand, row.maximumStock))
        .length,
    ).toBe(1);
  });
});

describe("rental duration aggregation", () => {
  it("averages duration across non-cancelled orders", () => {
    const durations = [
      calculateRentalDurationDays(
        new Date("2026-06-10T00:00:00.000Z"),
        new Date("2026-06-12T00:00:00.000Z"),
      ),
      calculateRentalDurationDays(
        new Date("2026-05-20T00:00:00.000Z"),
        new Date("2026-05-22T00:00:00.000Z"),
      ),
      calculateRentalDurationDays(
        new Date("2026-07-10T00:00:00.000Z"),
        new Date("2026-07-11T00:00:00.000Z"),
      ),
    ];

    expect(average(durations)).toBe(1.67);
  });

  it("excludes cancelled orders from average conceptually", () => {
    const activeDurations = [2, 2, 1];
    const withCancelled = [...activeDurations, 0];
    expect(average(activeDurations)).toBe(1.67);
    expect(average(withCancelled)).toBe(1.25);
  });

  it("computes single-day rental as one day minimum", () => {
    const duration = calculateRentalDurationDays(
      new Date("2026-07-10T08:00:00.000Z"),
      new Date("2026-07-10T20:00:00.000Z"),
    );
    expect(duration).toBe(1);
  });
});

describe("warehouse utilization", () => {
  it("computes utilization percent from reserved over on hand", () => {
    const inventoryQuantity = 50;
    const reservedQuantity = 10;
    const utilization = roundMoney((reservedQuantity / inventoryQuantity) * 100);
    expect(utilization).toBe(20);
  });

  it("returns zero utilization for empty warehouse", () => {
    const inventoryQuantity = 0;
    const reservedQuantity = 0;
    const utilization =
      inventoryQuantity === 0
        ? 0
        : roundMoney((reservedQuantity / inventoryQuantity) * 100);
    expect(utilization).toBe(0);
  });
});

describe("procurement supplier totals", () => {
  it("aggregates purchase totals by supplier", () => {
    const orders = [
      { supplierId: "s1", total: 200 },
      { supplierId: "s1", total: 200 },
      { supplierId: "s2", total: 400 },
    ];

    const totals = new Map<string, number>();
    for (const order of orders) {
      totals.set(order.supplierId, roundMoney((totals.get(order.supplierId) ?? 0) + order.total));
    }

    expect(totals.get("s1")).toBe(400);
    expect(totals.get("s2")).toBe(400);
  });
});

describe("customer revenue aggregation", () => {
  it("sums order grand totals per customer", () => {
    const orders = [
      { customerId: "c1", grandTotal: 500 },
      { customerId: "c1", grandTotal: 300 },
      { customerId: "c2", grandTotal: 800 },
    ];

    const revenue = roundMoney(
      orders
        .filter((order) => order.customerId === "c1")
        .reduce((sum, order) => sum + order.grandTotal, 0),
    );

    expect(revenue).toBe(800);
  });
});

describe("dispatch turnaround aggregation", () => {
  it("averages turnaround hours for completed dispatches", () => {
    const values = [3, 5];
    expect(average(values)).toBe(4);
  });

  it("ignores null turnaround values", () => {
    const values = [3, null, 5].filter((v): v is number => v !== null);
    expect(average(values)).toBe(4);
  });
});

describe("return damage aggregation", () => {
  it("sums damaged and lost quantities", () => {
    const returns = [
      { damaged: 1, lost: 0 },
      { damaged: 0, lost: 1 },
    ];
    expect(returns.reduce((sum, row) => sum + row.damaged, 0)).toBe(1);
    expect(returns.reduce((sum, row) => sum + row.lost, 0)).toBe(1);
  });
});
