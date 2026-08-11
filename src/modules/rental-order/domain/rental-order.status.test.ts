import { describe, expect, it } from "vitest";

import {
  assertCanCancel,
  assertCanConfirm,
  assertCanMarkDispatched,
  assertCanMarkOnRent,
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

  it("assertCanMarkDispatched allows confirmed", () => {
    expect(() => assertCanMarkDispatched("CONFIRMED")).not.toThrow();
  });

  it("assertCanMarkDispatched allows reserved", () => {
    expect(() => assertCanMarkDispatched("RESERVED")).not.toThrow();
  });

  it("assertCanMarkDispatched rejects draft", () => {
    expect(() => assertCanMarkDispatched("DRAFT")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanMarkDispatched rejects dispatched", () => {
    expect(() => assertCanMarkDispatched("DISPATCHED")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanMarkDispatched rejects on_rent", () => {
    expect(() => assertCanMarkDispatched("ON_RENT")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanMarkDispatched rejects cancelled", () => {
    expect(() => assertCanMarkDispatched("CANCELLED")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanMarkDispatched rejects returned", () => {
    expect(() => assertCanMarkDispatched("RETURNED")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanMarkOnRent allows dispatched", () => {
    expect(() => assertCanMarkOnRent("DISPATCHED")).not.toThrow();
  });

  it("assertCanMarkOnRent rejects confirmed", () => {
    expect(() => assertCanMarkOnRent("CONFIRMED")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanMarkOnRent rejects reserved", () => {
    expect(() => assertCanMarkOnRent("RESERVED")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanMarkOnRent rejects on_rent", () => {
    expect(() => assertCanMarkOnRent("ON_RENT")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanMarkOnRent rejects cancelled", () => {
    expect(() => assertCanMarkOnRent("CANCELLED")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanMarkOnRent rejects returned", () => {
    expect(() => assertCanMarkOnRent("RETURNED")).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("assertCanMarkOnRent rejects completed", () => {
    expect(() => assertCanMarkOnRent("COMPLETED")).toThrow(
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

  it("marks confirmed order as dispatched", () => {
    const confirmed = buildConfirmedRentalOrderEntity();
    const dispatched = confirmed.withDispatched();

    expect(dispatched.status).toBe("DISPATCHED");
  });

  it("marks reserved order as dispatched without clearing reserved quantities", () => {
    const reserved = buildReservedRentalOrderEntity();
    const dispatched = reserved.withDispatched();

    expect(dispatched.status).toBe("DISPATCHED");
    expect(dispatched.items[0]?.reservedQuantity).toBe(10);
  });

  it("rejects draft to dispatched", () => {
    expect(() => buildRentalOrderEntity().withDispatched()).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("rejects cancelled to dispatched", () => {
    const cancelled = buildRentalOrderEntity({ status: "CANCELLED" });

    expect(() => cancelled.withDispatched()).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("rejects on_rent to dispatched", () => {
    const onRent = buildRentalOrderEntity({ status: "ON_RENT" });

    expect(() => onRent.withDispatched()).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("rejects returned to dispatched", () => {
    const returned = buildRentalOrderEntity({ status: "RETURNED" });

    expect(() => returned.withDispatched()).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("marks dispatched order as on rent", () => {
    const dispatched = buildRentalOrderEntity({ status: "DISPATCHED" });
    const onRent = dispatched.withOnRent();

    expect(onRent.status).toBe("ON_RENT");
  });

  it("rejects on_rent to on_rent", () => {
    const onRent = buildRentalOrderEntity({ status: "ON_RENT" });

    expect(() => onRent.withOnRent()).toThrow(RentalOrderInvalidStatusError);
  });

  it("rejects cancelled to on_rent", () => {
    const cancelled = buildRentalOrderEntity({ status: "CANCELLED" });

    expect(() => cancelled.withOnRent()).toThrow(RentalOrderInvalidStatusError);
  });

  it("rejects returned to on_rent", () => {
    const returned = buildRentalOrderEntity({ status: "RETURNED" });

    expect(() => returned.withOnRent()).toThrow(RentalOrderInvalidStatusError);
  });

  it("rejects completed to on_rent", () => {
    const completed = buildRentalOrderEntity({ status: "COMPLETED" });

    expect(() => completed.withOnRent()).toThrow(RentalOrderInvalidStatusError);
  });

  it("rejects confirmed to on_rent without dispatched intermediate", () => {
    expect(() => buildConfirmedRentalOrderEntity().withOnRent()).toThrow(
      RentalOrderInvalidStatusError,
    );
  });

  it("chains dispatched then on rent while preserving reserved quantities", () => {
    const reserved = buildReservedRentalOrderEntity();
    const onRent = reserved.withDispatched().withOnRent();

    expect(onRent.status).toBe("ON_RENT");
    expect(onRent.items[0]?.reservedQuantity).toBe(10);
    expect(onRent.orderNumber).toBe(reserved.orderNumber);
    expect(onRent.customerId).toBe(reserved.customerId);
    expect(onRent.warehouseId).toBe(reserved.warehouseId);
  });

  it("normalizes optional remarks to null", () => {
    const order = buildRentalOrderEntity();
    expect(order.remarks).toBe("Wedding event rental");
  });
});
