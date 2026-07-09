import { describe, expect, it } from "vitest";

import { InMemoryRentalOrderRepository } from "../tests/helpers/in-memory-rental-order.repository";
import {
  buildConfirmedRentalOrderEntity,
  buildCreateRentalOrderData,
  buildRentalOrderEntity,
} from "../tests/helpers/rental-order.fixtures";

describe("InMemoryRentalOrderRepository", () => {
  it("finds by order number", async () => {
    const repository = new InMemoryRentalOrderRepository();
    repository.seed([buildRentalOrderEntity()]);

    const found = await repository.findByOrderNumber("RO-2026-001");

    expect(found?.id).toBeDefined();
  });

  it("replaces items on draft update", async () => {
    const repository = new InMemoryRentalOrderRepository();
    repository.seed([buildRentalOrderEntity()]);
    const existing = buildRentalOrderEntity();

    const updated = await repository.update(existing.id, {
      items: buildCreateRentalOrderData({
        items: [
          {
            productId: existing.items[0]!.productId,
            quantity: 50,
            dailyRate: 30,
          },
        ],
      }).items,
    });

    expect(updated.items[0]?.quantity).toBe(50);
    expect(updated.items[0]?.reservedQuantity).toBe(0);
  });

  it("updates reserve quantities and status", async () => {
    const repository = new InMemoryRentalOrderRepository();
    const order = buildConfirmedRentalOrderEntity();
    repository.seed([order]);
    const itemId = order.items[0]!.id;

    const updated = await repository.updateReserve(order.id, {
      status: "CONFIRMED",
      items: [{ id: itemId, reservedQuantity: 4 }],
    });

    expect(updated.items[0]?.reservedQuantity).toBe(4);
  });

  it("filters paged results by status", async () => {
    const repository = new InMemoryRentalOrderRepository();
    repository.seed([
      buildRentalOrderEntity(),
      buildConfirmedRentalOrderEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "CONFIRMED",
    });

    expect(result.items).toHaveLength(1);
  });

  it("updates status directly", async () => {
    const repository = new InMemoryRentalOrderRepository();
    const order = buildRentalOrderEntity();
    repository.seed([order]);

    const updated = await repository.updateStatus(order.id, "CANCELLED");

    expect(updated.status).toBe("CANCELLED");
  });
});
