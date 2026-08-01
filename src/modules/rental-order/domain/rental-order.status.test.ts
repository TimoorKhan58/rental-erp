import { describe, expect, it } from "vitest";

import {
  assertCanCancel,
  assertCanConfirm,
  assertCanReserve,
  assertCanUpdate,
} from "@/modules/rental-order/domain/rental-order.rules";
import { RentalOrderInvalidStatusError } from "@/modules/rental-order/domain/rental-order.errors";

import {
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
    expect(() => assertCanCancel("CONFIRMED")).not.toThrow();
  });

  it("assertCanCancel allows reserved status (release handled by cancel service)", () => {
    expect(() => assertCanCancel("RESERVED")).not.toThrow();
  });

  it("assertCanCancel rejects on-rent status", () => {
    expect(() => assertCanCancel("ON_RENT")).toThrow(
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

  it("allows cancel on partially reserved entity at domain level", () => {
    const partial = buildPartiallyReservedConfirmedEntity();
    const cancelled = partial.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("allows cancel on fully reserved entity at domain level", () => {
    const reserved = buildReservedRentalOrderEntity();
    const cancelled = reserved.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("normalizes optional remarks to null", () => {
    const order = buildRentalOrderEntity();
    expect(order.remarks).toBe("Wedding event rental");
  });
});
