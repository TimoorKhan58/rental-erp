import { describe, expect, it } from "vitest";

import { PurchaseOrder } from "@/modules/procurement/domain/purchase-order.entity";
import {
  PurchaseOrderInvalidReceiveError,
  PurchaseOrderInvalidStatusError,
  PurchaseOrderInvariantError,
  createPoNumber,
} from "@/modules/procurement/domain/purchase-order.errors";
import {
  applyReceiveToItems,
  computeStatusAfterReceive,
  validatePurchaseOrderItems,
} from "@/modules/procurement/domain/purchase-order.rules";

import {
  ITEM_ID,
  OTHER_PRODUCT_ID,
  PRODUCT_ID,
  buildApprovedPurchaseOrderEntity,
  buildCreatePurchaseOrderData,
  buildPurchaseOrderEntity,
} from "../tests/helpers/purchase-order.fixtures";

describe("PurchaseOrder entity", () => {
  it("creates normalized purchase order props", () => {
    const props = PurchaseOrder.create(buildCreatePurchaseOrderData());

    expect(props.poNumber).toBe("PO-2026-001");
    expect(props.items).toHaveLength(1);
  });

  it("rejects empty PO number", () => {
    expect(() =>
      PurchaseOrder.create(
        buildCreatePurchaseOrderData({ poNumber: "   " }),
      ),
    ).toThrow(PurchaseOrderInvariantError);
  });

  it("rejects empty items", () => {
    expect(() =>
      PurchaseOrder.create(buildCreatePurchaseOrderData({ items: [] })),
    ).toThrow(PurchaseOrderInvariantError);
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      PurchaseOrder.create(
        buildCreatePurchaseOrderData({
          items: [{ productId: PRODUCT_ID, quantity: 0, unitCost: 10 }],
        }),
      ),
    ).toThrow(PurchaseOrderInvariantError);
  });

  it("rejects negative unit cost", () => {
    expect(() =>
      PurchaseOrder.create(
        buildCreatePurchaseOrderData({
          items: [{ productId: PRODUCT_ID, quantity: 10, unitCost: -1 }],
        }),
      ),
    ).toThrow(PurchaseOrderInvariantError);
  });

  it("rejects duplicate products in items", () => {
    expect(() =>
      PurchaseOrder.create(
        buildCreatePurchaseOrderData({
          items: [
            { productId: PRODUCT_ID, quantity: 10, unitCost: 10 },
            { productId: PRODUCT_ID, quantity: 5, unitCost: 12 },
          ],
        }),
      ),
    ).toThrow(PurchaseOrderInvariantError);
  });

  it("reconstitutes persisted purchase order", () => {
    const order = buildPurchaseOrderEntity();

    expect(order.toProps().poNumber).toBe("PO-2026-001");
  });

  it("approves draft purchase order", () => {
    const order = buildPurchaseOrderEntity();
    const approved = order.withApproved();

    expect(approved.status).toBe("APPROVED");
  });

  it("rejects approve when not draft", () => {
    const order = buildApprovedPurchaseOrderEntity();

    expect(() => order.withApproved()).toThrow(PurchaseOrderInvalidStatusError);
  });

  it("cancels draft purchase order", () => {
    const order = buildPurchaseOrderEntity();
    const cancelled = order.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects cancel when partially received", () => {
    const order = buildPurchaseOrderEntity({
      status: "PARTIALLY_RECEIVED",
      receivedQuantity: 10,
    });

    expect(() => order.withCancelled()).toThrow(PurchaseOrderInvalidStatusError);
  });

  it("receives approved purchase order partially", () => {
    const order = buildApprovedPurchaseOrderEntity();
    const received = order.withReceived([
      { productId: PRODUCT_ID, quantity: 40 },
    ]);

    expect(received.status).toBe("PARTIALLY_RECEIVED");
    expect(received.items[0]?.receivedQuantity).toBe(40);
  });

  it("receives approved purchase order fully", () => {
    const order = buildApprovedPurchaseOrderEntity();
    const received = order.withReceived([
      { productId: PRODUCT_ID, quantity: 100 },
    ]);

    expect(received.status).toBe("RECEIVED");
    expect(received.items[0]?.receivedQuantity).toBe(100);
  });

  it("rejects receive when draft", () => {
    const order = buildPurchaseOrderEntity();

    expect(() =>
      order.withReceived([{ productId: PRODUCT_ID, quantity: 10 }]),
    ).toThrow(PurchaseOrderInvalidStatusError);
  });

  it("rejects receive exceeding ordered quantity", () => {
    const order = buildApprovedPurchaseOrderEntity();

    expect(() =>
      order.withReceived([{ productId: PRODUCT_ID, quantity: 101 }]),
    ).toThrow(PurchaseOrderInvalidReceiveError);
  });

  it("assertCanUpdate allows draft only", () => {
    expect(() => buildPurchaseOrderEntity().assertCanUpdate()).not.toThrow();
    expect(() =>
      buildApprovedPurchaseOrderEntity().assertCanUpdate(),
    ).toThrow(PurchaseOrderInvalidStatusError);
  });
});

describe("PurchaseOrder rules", () => {
  it("validates purchase order items", () => {
    const items = validatePurchaseOrderItems([
      { productId: PRODUCT_ID, quantity: 10, unitCost: 25 },
    ]);

    expect(items[0]?.receivedQuantity).toBe(0);
  });

  it("computes received status", () => {
    expect(
      computeStatusAfterReceive([
        {
          id: ITEM_ID,
          productId: PRODUCT_ID,
          quantity: 100,
          unitCost: 10,
          receivedQuantity: 100,
        },
      ]),
    ).toBe("RECEIVED");

    expect(
      computeStatusAfterReceive([
        {
          id: ITEM_ID,
          productId: PRODUCT_ID,
          quantity: 100,
          unitCost: 10,
          receivedQuantity: 50,
        },
      ]),
    ).toBe("PARTIALLY_RECEIVED");
  });

  it("applies receive quantities to matching items", () => {
    const updated = applyReceiveToItems(
      [
        {
          id: ITEM_ID,
          productId: PRODUCT_ID,
          quantity: 100,
          unitCost: 10,
          receivedQuantity: 20,
        },
      ],
      [{ productId: PRODUCT_ID, quantity: 30 }],
    );

    expect(updated[0]?.receivedQuantity).toBe(50);
  });

  it("rejects unknown product on receive", () => {
    expect(() =>
      applyReceiveToItems(
        [
          {
            id: ITEM_ID,
            productId: PRODUCT_ID,
            quantity: 100,
            unitCost: 10,
            receivedQuantity: 0,
          },
        ],
        [{ productId: OTHER_PRODUCT_ID, quantity: 10 }],
      ),
    ).toThrow(PurchaseOrderInvalidReceiveError);
  });
});

describe("createPoNumber", () => {
  it("accepts valid PO number", () => {
    expect(createPoNumber("PO-001")).toBe("PO-001");
  });

  it("trims PO number", () => {
    expect(createPoNumber("  PO-002  ")).toBe("PO-002");
  });

  it("rejects empty PO number", () => {
    expect(() => createPoNumber("  ")).toThrow(PurchaseOrderInvariantError);
  });
});
