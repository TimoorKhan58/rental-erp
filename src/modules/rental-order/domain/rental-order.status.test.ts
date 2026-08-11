import { describe, expect, it } from "vitest";

import {
  assertCanCancel,
  assertCanConfirm,
  assertCanReserve,
  assertCanUpdate,
} from "@/modules/rental-order/domain/rental-order.rules";
import { RentalOrderInvalidStatusError } from "@/modules/rental-order/domain/rental-order.errors";

import {
  ITEM_ID,
  PRODUCT_ID,
  buildConfirmedRentalOrderEntity,
  buildPartiallyReservedConfirmedEntity,
  buildRentalOrderEntity,
  buildReservedRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";

describe("status transition guards", () => {
  it("assertCanUpdate allows draft", () => {
    expect(() => assertCanUpdate("DRAFT")).not.toThrow();
  });

  it("assertCanUpdate rejects confirmed", () => {
    expect(() => assertCanUpdate("CONFIRMED")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanConfirm allows draft", () => {
    expect(() => assertCanConfirm("DRAFT")).not.toThrow();
  });

  it("assertCanConfirm rejects reserved", () => {
    expect(() => assertCanConfirm("RESERVED")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanReserve allows confirmed", () => {
    expect(() => assertCanReserve("CONFIRMED")).not.toThrow();
  });

  it("assertCanReserve rejects cancelled", () => {
    expect(() => assertCanReserve("CANCELLED")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanCancel allows draft", () => {
    expect(() => assertCanCancel("DRAFT", [])).not.toThrow();
  });

  it("assertCanCancel allows confirmed with no reservations", () => {
    expect(() =>
      assertCanCancel("CONFIRMED", [
        {
          id: ITEM_ID,
          productId: PRODUCT_ID,
          quantity: 10,
          dailyRate: 10,
          reservedQuantity: 0,
          startDate: new Date("2026-02-01T00:00:00.000Z"),
          endDate: new Date("2026-02-05T00:00:00.000Z"),
          numberOfDays: 4,
        },
      ]),
    ).not.toThrow();
  });

  it("assertCanCancel allows confirmed with reservations", () => {
    expect(() =>
      assertCanCancel("CONFIRMED", [
        {
          id: ITEM_ID,
          productId: PRODUCT_ID,
          quantity: 10,
          dailyRate: 10,
          reservedQuantity: 4,
          startDate: new Date("2026-02-01T00:00:00.000Z"),
          endDate: new Date("2026-02-05T00:00:00.000Z"),
          numberOfDays: 4,
        },
      ]),
    ).not.toThrow();
  });

  it("assertCanCancel allows reserved status", () => {
    expect(() => assertCanCancel("RESERVED", [])).not.toThrow();
  });

  it("assertCanCancel rejects cancelled", () => {
    expect(() => assertCanCancel("CANCELLED", [])).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanCancel rejects dispatched", () => {
    expect(() => assertCanCancel("DISPATCHED", [])).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanCancel rejects on_rent", () => {
    expect(() => assertCanCancel("ON_RENT", [])).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanCancel rejects partially_returned", () => {
    expect(() => assertCanCancel("PARTIALLY_RETURNED", [])).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanCancel rejects returned", () => {
    expect(() => assertCanCancel("RETURNED", [])).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanCancel rejects completed", () => {
    expect(() => assertCanCancel("COMPLETED", [])).toThrow(
      RentalOrderInvalidStatusError,
    );
  });
});

describe("rental order entity edge cases", () => {
  it("allows cumulative partial reserves", () => {
    const confirmed = buildConfirmedRentalOrderEntity();
    const first = confirmed.withReserved([
      { productId: PRODUCT_ID, quantity: 3 },
    ]);
    const second = first.withReserved([
      { productId: PRODUCT_ID, quantity: 2 },
    ]);

    expect(second.items[0]?.reservedQuantity).toBe(5);
    expect(second.status).toBe("CONFIRMED");
  });

  it("cancels confirmed rental order with zero reservations", () => {
    const confirmed = buildConfirmedRentalOrderEntity();
    const cancelled = confirmed.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("cancels partially reserved confirmed entity and clears reserved", () => {
    const partial = buildPartiallyReservedConfirmedEntity();
    const cancelled = partial.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.items[0]?.reservedQuantity).toBe(0);
  });

  it("cancels fully reserved entity and clears reserved", () => {
    const reserved = buildReservedRentalOrderEntity();
    const cancelled = reserved.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.items[0]?.reservedQuantity).toBe(0);
  });

  it("rejects cancel on dispatched entity", () => {
    const order = buildRentalOrderEntity({ status: "DISPATCHED" });

    expect(() => order.withCancelled()).toThrow(RentalOrderInvalidStatusError);
  });

  it("normalizes optional remarks to null", () => {
    const order = buildRentalOrderEntity();
    expect(order.remarks).toBe("Wedding event rental");
  });
});
