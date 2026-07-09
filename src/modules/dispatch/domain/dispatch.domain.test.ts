import { describe, expect, it } from "vitest";

import { Dispatch } from "@/modules/dispatch/domain/dispatch.entity";
import {
  DispatchInvalidItemError,
  DispatchInvalidStatusError,
  DispatchInvariantError,
  createDispatchNumber,
} from "@/modules/dispatch/domain/dispatch.errors";
import {
  assertRentalOrderEligibleForDispatch,
  validateDeliveryAddress,
  validateDispatchDate,
  validateDispatchItems,
  validateDispatchItemsAgainstRentalOrder,
} from "@/modules/dispatch/domain/dispatch.rules";

import {
  ITEM_ID,
  PRODUCT_ID,
  buildCreateDispatchData,
  buildDispatchEntity,
  buildReadyDispatchEntity,
} from "../tests/helpers/dispatch.fixtures";

describe("Dispatch entity", () => {
  it("creates normalized dispatch props", () => {
    const props = Dispatch.create(buildCreateDispatchData());

    expect(props.dispatchNumber).toBe("DSP-2026-001");
    expect(props.items).toHaveLength(1);
  });

  it("rejects empty dispatch number", () => {
    expect(() =>
      Dispatch.create(
        buildCreateDispatchData({ dispatchNumber: "   " }),
      ),
    ).toThrow(DispatchInvariantError);
  });

  it("rejects empty items", () => {
    expect(() =>
      Dispatch.create(buildCreateDispatchData({ items: [] })),
    ).toThrow(DispatchInvariantError);
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      Dispatch.create(
        buildCreateDispatchData({
          items: [{ productId: PRODUCT_ID, quantity: 0 }],
        }),
      ),
    ).toThrow(DispatchInvariantError);
  });

  it("rejects duplicate products in items", () => {
    expect(() =>
      Dispatch.create(
        buildCreateDispatchData({
          items: [
            { productId: PRODUCT_ID, quantity: 5 },
            { productId: PRODUCT_ID, quantity: 3 },
          ],
        }),
      ),
    ).toThrow(DispatchInvariantError);
  });

  it("rejects invalid dispatch date", () => {
    expect(() =>
      Dispatch.create(
        buildCreateDispatchData({ dispatchDate: new Date("invalid") }),
      ),
    ).toThrow(DispatchInvariantError);
  });

  it("rejects empty delivery address", () => {
    expect(() =>
      Dispatch.create(
        buildCreateDispatchData({ deliveryAddress: "   " }),
      ),
    ).toThrow(DispatchInvariantError);
  });

  it("reconstitutes persisted dispatch", () => {
    const dispatch = buildDispatchEntity();

    expect(dispatch.toProps().dispatchNumber).toBe("DSP-2026-001");
  });

  it("marks draft dispatch as ready", () => {
    const dispatch = buildDispatchEntity();
    const ready = dispatch.withReady();

    expect(ready.status).toBe("READY");
    expect(ready.readyAt).not.toBeNull();
  });

  it("rejects mark ready when not draft", () => {
    const dispatch = buildReadyDispatchEntity();

    expect(() => dispatch.withReady()).toThrow(DispatchInvalidStatusError);
  });

  it("dispatches ready dispatch", () => {
    const dispatch = buildReadyDispatchEntity();
    const dispatched = dispatch.withDispatched();

    expect(dispatched.status).toBe("DISPATCHED");
    expect(dispatched.dispatchedAt).not.toBeNull();
  });

  it("rejects dispatch when not ready", () => {
    const dispatch = buildDispatchEntity();

    expect(() => dispatch.withDispatched()).toThrow(DispatchInvalidStatusError);
  });

  it("completes dispatched dispatch", () => {
    const dispatch = buildReadyDispatchEntity().withDispatched();
    const completed = dispatch.withCompleted();

    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).not.toBeNull();
  });

  it("rejects complete when not dispatched", () => {
    const dispatch = buildReadyDispatchEntity();

    expect(() => dispatch.withCompleted()).toThrow(DispatchInvalidStatusError);
  });

  it("cancels draft dispatch", () => {
    const dispatch = buildDispatchEntity();
    const cancelled = dispatch.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("cancels ready dispatch", () => {
    const dispatch = buildReadyDispatchEntity();
    const cancelled = dispatch.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects cancel when dispatched", () => {
    const dispatch = buildReadyDispatchEntity().withDispatched();

    expect(() => dispatch.withCancelled()).toThrow(DispatchInvalidStatusError);
  });

  it("assertCanUpdate allows draft only", () => {
    expect(() => buildDispatchEntity().assertCanUpdate()).not.toThrow();
    expect(() => buildReadyDispatchEntity().assertCanUpdate()).toThrow(
      DispatchInvalidStatusError,
    );
  });
});

describe("Dispatch rules", () => {
  it("validates dispatch items", () => {
    const items = validateDispatchItems([
      { productId: PRODUCT_ID, quantity: 5 },
    ]);

    expect(items[0]?.quantity).toBe(5);
  });

  it("validates dispatch date", () => {
    expect(() => validateDispatchDate(new Date("invalid"))).toThrow(
      DispatchInvariantError,
    );
  });

  it("validates delivery address", () => {
    expect(validateDeliveryAddress(" 123 Main St ")).toBe("123 Main St");
  });

  it("validates items against rental order", () => {
    expect(() =>
      validateDispatchItemsAgainstRentalOrder(
        [{ productId: PRODUCT_ID, rentalOrderItemId: ITEM_ID, quantity: 5 }],
        [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            quantity: 10,
            dailyRate: 150,
            reservedQuantity: 10,
          },
        ],
      ),
    ).not.toThrow();
  });

  it("rejects unknown product on rental order validation", () => {
    expect(() =>
      validateDispatchItemsAgainstRentalOrder(
        [{ productId: PRODUCT_ID, quantity: 5 }],
        [],
      ),
    ).toThrow(DispatchInvalidItemError);
  });

  it("rejects quantity exceeding reserved quantity", () => {
    expect(() =>
      validateDispatchItemsAgainstRentalOrder(
        [{ productId: PRODUCT_ID, quantity: 11 }],
        [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            quantity: 10,
            dailyRate: 150,
            reservedQuantity: 10,
          },
        ],
      ),
    ).toThrow(DispatchInvalidItemError);
  });

  it("rejects ineligible rental order status", () => {
    expect(() => assertRentalOrderEligibleForDispatch("DRAFT")).toThrow(
      DispatchInvalidItemError,
    );
  });
});

describe("createDispatchNumber", () => {
  it("accepts valid dispatch number", () => {
    expect(createDispatchNumber("DSP-001")).toBe("DSP-001");
  });

  it("trims dispatch number", () => {
    expect(createDispatchNumber("  DSP-002  ")).toBe("DSP-002");
  });

  it("rejects empty dispatch number", () => {
    expect(() => createDispatchNumber("  ")).toThrow(DispatchInvariantError);
  });
});
