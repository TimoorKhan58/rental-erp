import { describe, expect, it } from "vitest";

import { RentalOrder } from "@/modules/rental-order/domain/rental-order.entity";
import {
  RentalOrderInvalidReserveError,
  RentalOrderInvalidStatusError,
  RentalOrderInvariantError,
  createOrderNumber,
} from "@/modules/rental-order/domain/rental-order.errors";
import {
  applyReserveToItems,
  computeStatusAfterReserve,
  validateRentalOrderItems,
  validateRentalPeriod,
} from "@/modules/rental-order/domain/rental-order.rules";

const LINE_PERIOD = {
  startDate: new Date("2026-02-01T00:00:00.000Z"),
  endDate: new Date("2026-02-05T00:00:00.000Z"),
  numberOfDays: 4,
};

function buildLineItem(
  override: Partial<{
    id: string;
    productId: typeof PRODUCT_ID;
    quantity: number;
    dailyRate: number;
    reservedQuantity: number;
    startDate: Date;
    endDate: Date;
    numberOfDays: number;
  }> = {},
) {
  return {
    id: ITEM_ID,
    productId: PRODUCT_ID,
    quantity: 10,
    dailyRate: 10,
    reservedQuantity: 0,
    ...LINE_PERIOD,
    ...override,
  };
}

import {
  ITEM_ID,
  OTHER_PRODUCT_ID,
  PRODUCT_ID,
  buildConfirmedRentalOrderEntity,
  buildCreateRentalOrderData,
  buildRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";

describe("RentalOrder entity", () => {
  it("creates normalized rental order props", () => {
    const props = RentalOrder.create(buildCreateRentalOrderData());

    expect(props.orderNumber).toBe("RO-2026-001");
    expect(props.items).toHaveLength(1);
  });

  it("rejects empty order number", () => {
    expect(() =>
      RentalOrder.create(
        buildCreateRentalOrderData({ orderNumber: "   " }),
      ),
    ).toThrow(RentalOrderInvariantError);
  });

  it("rejects empty items", () => {
    expect(() =>
      RentalOrder.create(buildCreateRentalOrderData({ items: [] })),
    ).toThrow(RentalOrderInvariantError);
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      RentalOrder.create(
        buildCreateRentalOrderData({
          items: [{ productId: PRODUCT_ID, quantity: 0, dailyRate: 10 }],
        }),
      ),
    ).toThrow(RentalOrderInvariantError);
  });

  it("rejects non-positive daily rate", () => {
    expect(() =>
      RentalOrder.create(
        buildCreateRentalOrderData({
          items: [{ productId: PRODUCT_ID, quantity: 10, dailyRate: -1 }],
        }),
      ),
    ).toThrow(RentalOrderInvariantError);
  });

  it("rejects end date on or before start date", () => {
    expect(() =>
      RentalOrder.create(
        buildCreateRentalOrderData({
          startDate: new Date("2026-02-05T00:00:00.000Z"),
          endDate: new Date("2026-02-01T00:00:00.000Z"),
        }),
      ),
    ).toThrow(RentalOrderInvariantError);
  });

  it("rejects duplicate products in items", () => {
    expect(() =>
      RentalOrder.create(
        buildCreateRentalOrderData({
          items: [
            { productId: PRODUCT_ID, quantity: 10, dailyRate: 10 },
            { productId: PRODUCT_ID, quantity: 5, dailyRate: 12 },
          ],
        }),
      ),
    ).toThrow(RentalOrderInvariantError);
  });

  it("reconstitutes persisted rental order", () => {
    const order = buildRentalOrderEntity();

    expect(order.toProps().orderNumber).toBe("RO-2026-001");
  });

  it("confirms draft rental order", () => {
    const order = buildRentalOrderEntity();
    const confirmed = order.withConfirmed();

    expect(confirmed.status).toBe("CONFIRMED");
  });

  it("rejects confirm when not draft", () => {
    const order = buildConfirmedRentalOrderEntity();

    expect(() => order.withConfirmed()).toThrow(RentalOrderInvalidStatusError);
  });

  it("cancels draft rental order", () => {
    const order = buildRentalOrderEntity();
    const cancelled = order.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects cancel when reserved", () => {
    const order = buildRentalOrderEntity({
      status: "CONFIRMED",
      reservedQuantity: 5,
    });

    expect(() => order.withCancelled()).toThrow(RentalOrderInvalidStatusError);
  });

  it("reserves confirmed rental order partially", () => {
    const order = buildConfirmedRentalOrderEntity();
    const reserved = order.withReserved([
      { productId: PRODUCT_ID, quantity: 4 },
    ]);

    expect(reserved.status).toBe("CONFIRMED");
    expect(reserved.items[0]?.reservedQuantity).toBe(4);
  });

  it("reserves confirmed rental order fully", () => {
    const order = buildConfirmedRentalOrderEntity();
    const reserved = order.withReserved([
      { productId: PRODUCT_ID, quantity: 10 },
    ]);

    expect(reserved.status).toBe("RESERVED");
    expect(reserved.items[0]?.reservedQuantity).toBe(10);
  });

  it("rejects reserve when draft", () => {
    const order = buildRentalOrderEntity();

    expect(() =>
      order.withReserved([{ productId: PRODUCT_ID, quantity: 10 }]),
    ).toThrow(RentalOrderInvalidStatusError);
  });

  it("rejects reserve exceeding ordered quantity", () => {
    const order = buildConfirmedRentalOrderEntity();

    expect(() =>
      order.withReserved([{ productId: PRODUCT_ID, quantity: 11 }]),
    ).toThrow(RentalOrderInvalidReserveError);
  });

  it("assertCanUpdate allows draft only", () => {
    expect(() => buildRentalOrderEntity().assertCanUpdate()).not.toThrow();
    expect(() =>
      buildConfirmedRentalOrderEntity().assertCanUpdate(),
    ).toThrow(RentalOrderInvalidStatusError);
  });
});

describe("RentalOrder rules", () => {
  const orderStart = new Date("2026-02-01T00:00:00.000Z");
  const orderEnd = new Date("2026-02-05T00:00:00.000Z");

  it("validates rental order items", () => {
    const items = validateRentalOrderItems(
      [{ productId: PRODUCT_ID, quantity: 10, dailyRate: 25 }],
      orderStart,
      orderEnd,
    );

    expect(items[0]?.reservedQuantity).toBe(0);
    expect(items[0]?.numberOfDays).toBeGreaterThan(0);
  });

  it("supports per-line rental periods within one order", () => {
    const items = validateRentalOrderItems(
      [
        {
          productId: PRODUCT_ID,
          quantity: 10,
          dailyRate: 25,
          startDate: new Date("2026-02-01T00:00:00.000Z"),
          endDate: new Date("2026-02-02T00:00:00.000Z"),
        },
        {
          productId: OTHER_PRODUCT_ID,
          quantity: 5,
          dailyRate: 40,
          startDate: new Date("2026-02-03T00:00:00.000Z"),
          endDate: new Date("2026-02-05T00:00:00.000Z"),
        },
      ],
      orderStart,
      orderEnd,
    );

    expect(items[0]?.numberOfDays).toBe(1);
    expect(items[1]?.numberOfDays).toBe(2);
  });

  it("counts same-day deliver and return as 1 day", () => {
    const items = validateRentalOrderItems(
      [
        {
          productId: PRODUCT_ID,
          quantity: 2,
          dailyRate: 100,
          startDate: new Date("2026-02-01T00:00:00.000Z"),
          endDate: new Date("2026-02-01T00:00:00.000Z"),
        },
      ],
      new Date("2026-02-01T00:00:00.000Z"),
      new Date("2026-02-01T00:00:00.000Z"),
    );

    expect(items[0]?.numberOfDays).toBe(1);
  });

  it("counts return within 24 hours as 1 day", () => {
    const items = validateRentalOrderItems(
      [
        {
          productId: PRODUCT_ID,
          quantity: 2,
          dailyRate: 100,
          startDate: new Date("2026-02-01T10:00:00.000Z"),
          endDate: new Date("2026-02-02T09:00:00.000Z"),
        },
      ],
      new Date("2026-02-01T10:00:00.000Z"),
      new Date("2026-02-02T09:00:00.000Z"),
    );

    expect(items[0]?.numberOfDays).toBe(1);
  });

  it("validates rental period", () => {
    expect(() =>
      validateRentalPeriod(
        new Date("2026-02-05T00:00:00.000Z"),
        new Date("2026-02-01T00:00:00.000Z"),
      ),
    ).toThrow(RentalOrderInvariantError);
  });

  it("computes reserved status", () => {
    expect(
      computeStatusAfterReserve([buildLineItem({ reservedQuantity: 10 })]),
    ).toBe("RESERVED");

    expect(
      computeStatusAfterReserve([buildLineItem({ reservedQuantity: 5 })]),
    ).toBe("CONFIRMED");
  });

  it("applies reserve quantities to matching items", () => {
    const updated = applyReserveToItems(
      [buildLineItem({ reservedQuantity: 2 })],
      [{ productId: PRODUCT_ID, quantity: 3 }],
    );

    expect(updated[0]?.reservedQuantity).toBe(5);
  });

  it("rejects unknown product on reserve", () => {
    expect(() =>
      applyReserveToItems(
        [buildLineItem()],
        [{ productId: OTHER_PRODUCT_ID, quantity: 10 }],
      ),
    ).toThrow(RentalOrderInvalidReserveError);
  });

  it("rejects empty reserve items", () => {
    expect(() =>
      applyReserveToItems(
        [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            quantity: 10,
            dailyRate: 10,
            reservedQuantity: 0,
          },
        ],
        [],
      ),
    ).toThrow(RentalOrderInvalidReserveError);
  });
});

describe("createOrderNumber", () => {
  it("accepts valid order number", () => {
    expect(createOrderNumber("RO-001")).toBe("RO-001");
  });

  it("trims order number", () => {
    expect(createOrderNumber("  RO-002  ")).toBe("RO-002");
  });

  it("rejects empty order number", () => {
    expect(() => createOrderNumber("  ")).toThrow(RentalOrderInvariantError);
  });
});
