import { describe, expect, it } from "vitest";

import { InMemoryRepairRepository } from "./helpers/in-memory-repair.repository";
import {
  buildCreateRepairData,
  buildInProgressRepairEntity,
  buildRepairEntity,
  REPAIR_ID,
  RETURN_ID,
} from "./helpers/repair.fixtures";

describe("InMemoryRepairRepository", () => {
  it("finds by repair number", async () => {
    const repository = new InMemoryRepairRepository();
    repository.seed([buildRepairEntity()]);

    const found = await repository.findByRepairNumber("RPR-2026-001");

    expect(found?.id).toBe(REPAIR_ID);
  });

  it("finds by return id", async () => {
    const repository = new InMemoryRepairRepository();
    repository.seed([buildRepairEntity()]);

    const found = await repository.findByReturnId(RETURN_ID);

    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe(REPAIR_ID);
  });

  it("updates pending repair fields", async () => {
    const repository = new InMemoryRepairRepository();
    repository.seed([buildRepairEntity()]);

    const updated = await repository.update(REPAIR_ID, {
      repairNotes: "Updated notes",
      repairCost: 100,
    });

    expect(updated.repairNotes).toBe("Updated notes");
    expect(updated.repairCost).toBe(100);
  });

  it("updates status with timestamps", async () => {
    const repository = new InMemoryRepairRepository();
    const repair = buildRepairEntity();
    repository.seed([repair]);
    const startedAt = new Date("2026-01-18T10:00:00.000Z");

    const updated = await repository.updateStatus(repair.id, {
      status: "IN_PROGRESS",
      startedAt,
    });

    expect(updated.status).toBe("IN_PROGRESS");
    expect(updated.startedAt).toEqual(startedAt);
  });

  it("filters paged results by status", async () => {
    const repository = new InMemoryRepairRepository();
    repository.seed([
      buildRepairEntity(),
      buildInProgressRepairEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "IN_PROGRESS",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("IN_PROGRESS");
  });

  it("creates repair in pending status", async () => {
    const repository = new InMemoryRepairRepository();

    const created = await repository.create(buildCreateRepairData());

    expect(created.status).toBe("PENDING");
    expect(repository.count()).toBe(1);
  });

  it("filters paged results by return id", async () => {
    const repository = new InMemoryRepairRepository();
    repository.seed([buildRepairEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      returnId: RETURN_ID,
    });

    expect(result.items).toHaveLength(1);
  });
});
