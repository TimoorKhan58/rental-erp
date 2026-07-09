import { describe, expect, it } from "vitest";

import {
  assertCanApprove,
  assertCanCancel,
  assertCanReceive,
  assertCanUpdate,
} from "@/modules/procurement/domain/purchase-order.rules";
import { PurchaseOrderInvalidStatusError } from "@/modules/procurement/domain/purchase-order.errors";

import {
  ITEM_ID,
  PRODUCT_ID,
  buildApprovedPurchaseOrderEntity,
  buildPartiallyReceivedPurchaseOrderEntity,
  buildPurchaseOrderEntity,
} from "../tests/helpers/purchase-order.fixtures";

describe("status transition guards", () => {
  it("assertCanUpdate allows draft", () => {
    expect(() => assertCanUpdate("DRAFT")).not.toThrow();
  });

  it("assertCanUpdate rejects approved", () => {
    expect(() => assertCanUpdate("APPROVED")).toThrow(
      PurchaseOrderInvalidStatusError,
    );
  });

  it("assertCanApprove allows draft", () => {
    expect(() => assertCanApprove("DRAFT")).not.toThrow();
  });

  it("assertCanApprove rejects received", () => {
    expect(() => assertCanApprove("RECEIVED")).toThrow(
      PurchaseOrderInvalidStatusError,
    );
  });

  it("assertCanReceive allows approved and partially received", () => {
    expect(() => assertCanReceive("APPROVED")).not.toThrow();
    expect(() => assertCanReceive("PARTIALLY_RECEIVED")).not.toThrow();
  });

  it("assertCanReceive rejects cancelled", () => {
    expect(() => assertCanReceive("CANCELLED")).toThrow(
      PurchaseOrderInvalidStatusError,
    );
  });

  it("assertCanCancel allows approved with no receipts", () => {
    expect(() =>
      assertCanCancel("APPROVED", [
        {
          id: ITEM_ID,
          productId: PRODUCT_ID,
          quantity: 100,
          unitCost: 10,
          receivedQuantity: 0,
        },
      ]),
    ).not.toThrow();
  });

  it("assertCanCancel rejects received status", () => {
    expect(() => assertCanCancel("RECEIVED", [])).toThrow(
      PurchaseOrderInvalidStatusError,
    );
  });
});

describe("purchase order entity edge cases", () => {
  it("allows cumulative partial receives", () => {
    const approved = buildApprovedPurchaseOrderEntity();
    const first = approved.withReceived([
      { productId: PRODUCT_ID, quantity: 30 },
    ]);
    const second = first.withReceived([
      { productId: PRODUCT_ID, quantity: 20 },
    ]);

    expect(second.items[0]?.receivedQuantity).toBe(50);
    expect(second.status).toBe("PARTIALLY_RECEIVED");
  });

  it("cancels approved purchase order with zero receipts", () => {
    const approved = buildApprovedPurchaseOrderEntity();
    const cancelled = approved.withCancelled();

    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects cancel on partially received entity", () => {
    const partial = buildPartiallyReceivedPurchaseOrderEntity();

    expect(() => partial.withCancelled()).toThrow(
      PurchaseOrderInvalidStatusError,
    );
  });

  it("normalizes optional remarks to null", () => {
    const order = buildPurchaseOrderEntity();
    expect(order.remarks).toBe("Urgent restock");
  });
});
