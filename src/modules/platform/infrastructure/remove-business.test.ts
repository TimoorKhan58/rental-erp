import { describe, expect, it } from "vitest";

import { deletionOrder, evaluateRemoval } from "./remove-business";

const DAY = 24 * 60 * 60 * 1000;
const deactivatedAt = new Date("2026-10-01T10:00:00Z");

describe("evaluateRemoval (SaaS phase 4d)", () => {
  it("refuses an active business", () => {
    expect(
      evaluateRemoval({ isActive: true, deactivatedAt: null, lastExportAt: null, now: new Date() }),
    ).toMatchObject({ allowed: false, reasons: ["Deactivate the business first."] });
  });

  it("waits 30 days after deactivation", () => {
    const result = evaluateRemoval({
      isActive: false,
      deactivatedAt,
      lastExportAt: new Date(deactivatedAt.getTime() + DAY),
      now: new Date(deactivatedAt.getTime() + 29 * DAY),
    });
    expect(result.allowed).toBe(false);
    expect(result.allowedFrom).toBe(new Date(deactivatedAt.getTime() + 30 * DAY).toISOString());
  });

  it("needs an export taken after deactivation", () => {
    const now = new Date(deactivatedAt.getTime() + 31 * DAY);
    expect(evaluateRemoval({ isActive: false, deactivatedAt, lastExportAt: null, now }).allowed).toBe(false);
    expect(
      evaluateRemoval({ isActive: false, deactivatedAt, lastExportAt: new Date(deactivatedAt.getTime() - DAY), now })
        .allowed,
    ).toBe(false);
  });

  it("allows removal after 30 days with a recent export", () => {
    expect(
      evaluateRemoval({
        isActive: false,
        deactivatedAt,
        lastExportAt: new Date(deactivatedAt.getTime() + 31 * DAY),
        now: new Date(deactivatedAt.getTime() + 31 * DAY),
      }),
    ).toMatchObject({ allowed: true, reasons: [] });
  });
});

describe("deletionOrder", () => {
  it("deletes children before the tables they require", () => {
    const order = deletionOrder(
      ["customers", "rental_orders", "rental_order_items", "products"],
      [
        { child: "rental_orders", parent: "customers", column: "customerId", required: true },
        { child: "rental_order_items", parent: "rental_orders", column: "rentalOrderId", required: true },
        { child: "rental_order_items", parent: "products", column: "productId", required: true },
      ],
    );
    expect(order.indexOf("rental_order_items")).toBeLessThan(order.indexOf("rental_orders"));
    expect(order.indexOf("rental_orders")).toBeLessThan(order.indexOf("customers"));
    expect(order.indexOf("rental_order_items")).toBeLessThan(order.indexOf("products"));
  });

  it("ignores optional links (they are cleared first) and refuses true cycles", () => {
    expect(
      deletionOrder(
        ["a", "b"],
        [
          { child: "a", parent: "b", column: "bId", required: true },
          { child: "b", parent: "a", column: "aId", required: false },
        ],
      ),
    ).toEqual(["a", "b"]);
    expect(() =>
      deletionOrder(
        ["a", "b"],
        [
          { child: "a", parent: "b", column: "bId", required: true },
          { child: "b", parent: "a", column: "aId", required: true },
        ],
      ),
    ).toThrow(/circular/);
  });
});
