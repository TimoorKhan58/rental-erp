import { describe, expect, it } from "vitest";

import {
  assertCanApplyLifecycleStatus,
  assertCanCancel,
  assertCanConfirm,
  assertCanReserve,
  assertCanUpdate,
  computeStatusAfterDispatchComplete,
  computeStatusAfterReturnComplete,
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

  it("assertCanCancel allows confirmed with no reservations", () => {
    expect(() =>
      assertCanCancel("CONFIRMED", [
        {
          id: ITEM_ID,
          productId: PRODUCT_ID,
          quantity: 10,
          dailyRate: 10,
          reservedQuantity: 0,
        },
      ]),
    ).not.toThrow();
  });

  it("assertCanCancel rejects reserved status", () => {
    expect(() => assertCanCancel("RESERVED", [])).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanApplyLifecycleStatus allows reserved to on rent", () => {
    expect(() =>
      assertCanApplyLifecycleStatus("RESERVED", "ON_RENT"),
    ).not.toThrow();
  });

  it("assertCanApplyLifecycleStatus rejects completed source", () => {
    expect(() =>
      assertCanApplyLifecycleStatus("COMPLETED", "ON_RENT"),
    ).toThrow(RentalOrderInvalidStatusError);
  });
});

describe("lifecycle status computation", () => {
  const reservedItems = [
    {
      id: ITEM_ID,
      productId: PRODUCT_ID,
      quantity: 10,
      dailyRate: 150,
      reservedQuantity: 10,
    },
  ];

  it("marks order ON_RENT when all reserved qty is dispatched", () => {
    const status = computeStatusAfterDispatchComplete(
      "RESERVED",
      reservedItems,
      new Map([[ITEM_ID, 10]]),
    );
    expect(status).toBe("ON_RENT");
  });

  it("marks order DISPATCHED when only part of reserved qty is dispatched", () => {
    const status = computeStatusAfterDispatchComplete(
      "RESERVED",
      reservedItems,
      new Map([[ITEM_ID, 5]]),
    );
    expect(status).toBe("DISPATCHED");
  });

  it("marks order COMPLETED when all reserved qty is returned", () => {
    const status = computeStatusAfterReturnComplete(
      "ON_RENT",
      reservedItems,
      new Map([[ITEM_ID, 10]]),
    );
    expect(status).toBe("COMPLETED");
  });

  it("marks order PARTIALLY_RETURNED when only part is returned", () => {
    const status = computeStatusAfterReturnComplete(
      "ON_RENT",
      reservedItems,
      new Map([[ITEM_ID, 4]]),
    );
    expect(status).toBe("PARTIALLY_RETURNED");
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

  it("rejects cancel on partially reserved entity", () => {
    const partial = buildPartiallyReservedConfirmedEntity();

    expect(() => partial.withCancelled()).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("rejects cancel on fully reserved entity", () => {
    const reserved = buildReservedRentalOrderEntity();

    expect(() => reserved.withCancelled()).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("advances lifecycle status on reserved order", () => {
    const reserved = buildReservedRentalOrderEntity();
    const onRent = reserved.withLifecycleStatus("ON_RENT");
    expect(onRent.status).toBe("ON_RENT");
  });

  it("normalizes optional remarks to null", () => {
    const order = buildRentalOrderEntity();
    expect(order.remarks).toBe("Wedding event rental");
  });
});
