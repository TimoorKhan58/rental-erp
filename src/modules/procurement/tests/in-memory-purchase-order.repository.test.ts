import { describe, expect, it } from "vitest";

import { InMemoryPurchaseOrderRepository } from "../tests/helpers/in-memory-purchase-order.repository";
import {
  buildApprovedPurchaseOrderEntity,
  buildCreatePurchaseOrderData,
  buildPurchaseOrderEntity,
} from "../tests/helpers/purchase-order.fixtures";

describe("InMemoryPurchaseOrderRepository", () => {
  it("finds by PO number", async () => {
    const repository = new InMemoryPurchaseOrderRepository();
    repository.seed([buildPurchaseOrderEntity()]);

    const found = await repository.findByPoNumber("PO-2026-001");

    expect(found?.id).toBeDefined();
  });

  it("replaces items on draft update", async () => {
    const repository = new InMemoryPurchaseOrderRepository();
    repository.seed([buildPurchaseOrderEntity()]);
    const existing = buildPurchaseOrderEntity();

    const updated = await repository.update(existing.id, {
      items: buildCreatePurchaseOrderData({
        items: [
          {
            productId: existing.items[0]!.productId,
            quantity: 50,
            unitCost: 30,
          },
        ],
      }).items,
    });

    expect(updated.items[0]?.quantity).toBe(50);
    expect(updated.items[0]?.receivedQuantity).toBe(0);
  });

  it("updates receive quantities and status", async () => {
    const repository = new InMemoryPurchaseOrderRepository();
    const order = buildApprovedPurchaseOrderEntity();
    repository.seed([order]);
    const itemId = order.items[0]!.id;

    const updated = await repository.updateReceive(order.id, {
      status: "PARTIALLY_RECEIVED",
      items: [{ id: itemId, receivedQuantity: 40 }],
    });

    expect(updated.status).toBe("PARTIALLY_RECEIVED");
    expect(updated.items[0]?.receivedQuantity).toBe(40);
  });

  it("filters paged results by supplier", async () => {
    const repository = new InMemoryPurchaseOrderRepository();
    repository.seed([
      buildPurchaseOrderEntity(),
      buildApprovedPurchaseOrderEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "APPROVED",
    });

    expect(result.items).toHaveLength(1);
  });
});
