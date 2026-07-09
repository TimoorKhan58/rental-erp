import { describe, expect, it } from "vitest";

import { InMemoryDispatchRepository } from "./helpers/in-memory-dispatch.repository";
import {
  buildCreateDispatchData,
  buildDispatchEntity,
  buildReadyDispatchEntity,
  DISPATCH_ID,
} from "./helpers/dispatch.fixtures";

describe("InMemoryDispatchRepository", () => {
  it("finds by dispatch number", async () => {
    const repository = new InMemoryDispatchRepository();
    repository.seed([buildDispatchEntity()]);

    const found = await repository.findByDispatchNumber("DSP-2026-001");

    expect(found?.id).toBe(DISPATCH_ID);
  });

  it("replaces items on draft update", async () => {
    const repository = new InMemoryDispatchRepository();
    repository.seed([buildDispatchEntity()]);

    const updated = await repository.update(DISPATCH_ID, {
      items: buildCreateDispatchData({
        items: [{ productId: buildDispatchEntity().items[0]!.productId, quantity: 8 }],
      }).items,
    });

    expect(updated.items[0]?.quantity).toBe(8);
  });

  it("updates status with timestamps", async () => {
    const repository = new InMemoryDispatchRepository();
    const dispatch = buildDispatchEntity();
    repository.seed([dispatch]);
    const readyAt = new Date("2026-01-16T10:00:00.000Z");

    const updated = await repository.updateStatus(dispatch.id, "READY", {
      readyAt,
    });

    expect(updated.status).toBe("READY");
    expect(updated.readyAt).toEqual(readyAt);
  });

  it("filters paged results by status", async () => {
    const repository = new InMemoryDispatchRepository();
    repository.seed([
      buildDispatchEntity(),
      buildReadyDispatchEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "READY",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("READY");
  });

  it("creates dispatch in draft status", async () => {
    const repository = new InMemoryDispatchRepository();

    const created = await repository.create(buildCreateDispatchData());

    expect(created.status).toBe("DRAFT");
    expect(repository.count()).toBe(1);
  });
});
