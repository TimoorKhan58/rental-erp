import { describe, expect, it } from "vitest";
import { toRentalOrderSelectorOption } from "./rental-order-option.mapper";

const order = {
  id: "order-1",
  orderNumber: "RO-000123",
  customerId: "customer-1",
  startDate: "2026-09-18",
  endDate: "2026-09-20",
};

describe("toRentalOrderSelectorOption", () => {
  it("puts customer name first and keeps the order number in the description", () => {
    const option = toRentalOrderSelectorOption(
      order,
      new Map([["customer-1", "Muhammad Ali"]]),
      new Map([["customer-1", "03001234567"]]),
    );

    expect(option.label).toBe("Muhammad Ali");
    expect(option.description).toContain("RO-000123");
    expect(option.keywords).toContain("RO-000123");
    expect(option.keywords).toContain("Muhammad Ali");
    expect(option.keywords).toContain("03001234567");
  });

  it("falls back to the order number when the customer name is unavailable", () => {
    const option = toRentalOrderSelectorOption(order, new Map());

    expect(option.label).toBe("RO-000123");
    expect(option.description).not.toBe("");
  });
});
