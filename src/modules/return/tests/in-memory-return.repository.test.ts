import { describe, expect, it } from "vitest";

import { InMemoryReturnRepository } from "./helpers/in-memory-return.repository";
import {
  buildCreateReturnData,
  buildInspectedReturnEntity,
  buildReceivedReturnEntity,
  buildReturnEntity,
  RETURN_ID,
} from "./helpers/return.fixtures";

describe("InMemoryReturnRepository", () => {
  it("finds by return number", async () => {
    const repository = new InMemoryReturnRepository();
    repository.seed([buildReturnEntity()]);

    const found = await repository.findByReturnNumber("RTN-2026-001");

    expect(found?.id).toBe(RETURN_ID);
  });

  it("finds by dispatch id", async () => {
    const repository = new InMemoryReturnRepository();
    repository.seed([buildReturnEntity()]);

    const found = await repository.findByDispatchId(
      buildReturnEntity().dispatchId,
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe(RETURN_ID);
  });

  it("replaces items on draft update", async () => {
    const repository = new InMemoryReturnRepository();
    repository.seed([buildReturnEntity()]);

    const updated = await repository.update(RETURN_ID, {
      items: buildCreateReturnData({
        items: [{ rentalOrderItemId: buildReturnEntity().items[0]!.rentalOrderItemId, quantity: 3 }],
      }).items,
    });

    expect(updated.items[0]?.returnedQuantity).toBe(3);
  });

  it("updates status with timestamps", async () => {
    const repository = new InMemoryReturnRepository();
    const returnRecord = buildReturnEntity();
    repository.seed([returnRecord]);
    const receivedAt = new Date("2026-01-18T10:00:00.000Z");

    const updated = await repository.updateStatus(returnRecord.id, {
      status: "RECEIVED",
      receivedAt,
    });

    expect(updated.status).toBe("RECEIVED");
    expect(updated.receivedAt).toEqual(receivedAt);
  });

  it("updates status with inspected items", async () => {
    const repository = new InMemoryReturnRepository();
    const inspected = buildInspectedReturnEntity();
    repository.seed([buildReceivedReturnEntity()]);

    const updated = await repository.updateStatus(RETURN_ID, {
      status: "INSPECTED",
      inspectedAt: inspected.inspectedAt,
      items: inspected.items,
    });

    expect(updated.status).toBe("INSPECTED");
    expect(updated.items[0]?.goodQuantity).toBe(3);
  });

  it("filters paged results by status", async () => {
    const repository = new InMemoryReturnRepository();
    repository.seed([
      buildReturnEntity(),
      buildReceivedReturnEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "RECEIVED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("RECEIVED");
  });

  it("creates return in draft status", async () => {
    const repository = new InMemoryReturnRepository();

    const created = await repository.create(buildCreateReturnData());

    expect(created.status).toBe("DRAFT");
    expect(repository.count()).toBe(1);
  });
});
