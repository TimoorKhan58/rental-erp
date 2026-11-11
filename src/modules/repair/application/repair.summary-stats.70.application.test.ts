import { describe, expect, it } from "vitest";

import { GetRepairSummaryService } from "@/modules/repair/application/services/get-repair-summary.service";
import { computeRepairSummaryResult } from "@/modules/repair/domain/repair-summary.rules";
import type { RepairId } from "@/shared/domain/ids";

import {
  buildRepairEntity,
  OTHER_REPAIR_ID,
  PRODUCT_ID,
  REPAIR_ID,
  WAREHOUSE_ID,
} from "../tests/helpers/repair.fixtures";
import { InMemoryRepairRepository } from "../tests/helpers/in-memory-repair.repository";

function buildManyPendingRepairs(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildRepairEntity({
      id: `ff0e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}` as RepairId,
      status: "PENDING",
      repairCost: 10,
    }),
  );
}

function createSeededRepairRepository(
  repairs: ReturnType<typeof buildRepairEntity>[],
) {
  const repository = new InMemoryRepairRepository();
  repository.seed(repairs);
  return repository;
}

describe("N-39-PATTERN-01 Batch 3 — repair summary stats completeness", () => {
  it("returns correct summary for exactly 100 repairs", async () => {
    const repository = createSeededRepairRepository(buildManyPendingRepairs(100));
    const service = new GetRepairSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRepairs).toBe(100);
    expect(summary.stats.totalRepairCost).toBe(1000);
    expect(summary.statusCounts.all).toBe(100);
  });

  it("returns correct summary for 101 repairs (pagination boundary)", async () => {
    const repository = createSeededRepairRepository(buildManyPendingRepairs(101));
    const service = new GetRepairSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRepairs).toBe(101);
    expect(summary.stats.totalRepairCost).toBe(1010);
  });

  it("returns correct summary for 150 repairs", async () => {
    const repository = createSeededRepairRepository(buildManyPendingRepairs(150));
    const service = new GetRepairSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRepairs).toBe(150);
    expect(summary.stats.totalRepairCost).toBe(1500);
    expect(summary.stats.pendingCount).toBe(150);
  });

  it("counts each status and cost across the full dataset", async () => {
    const repairs = [
      buildRepairEntity({
        id: REPAIR_ID,
        status: "COMPLETED",
        repairCost: 200,
      }),
      buildRepairEntity({
        id: OTHER_REPAIR_ID,
        status: "IN_PROGRESS",
        repairCost: 150,
      }),
      buildRepairEntity({
        id: "ff0e8400-e29b-41d4-a716-446655440002" as RepairId,
        status: "CANCELLED",
        repairCost: 75,
      }),
    ];
    const repository = createSeededRepairRepository(repairs);
    const service = new GetRepairSummaryService(repository);

    const summary = await service.execute({});
    const expected = computeRepairSummaryResult(
      repairs.map((repair) => ({
        status: repair.status,
        repairCost: repair.repairCost,
      })),
    );

    expect(summary).toEqual(expected);
    expect(summary.stats.totalRepairCost).toBe(425);
    expect(summary.stats.activeRepairs).toBe(2);
  });

  it("applies status filter to summary counts", async () => {
    const repository = createSeededRepairRepository([
      buildRepairEntity({ status: "PENDING", repairCost: 10 }),
      buildRepairEntity({
        id: OTHER_REPAIR_ID,
        status: "COMPLETED",
        repairCost: 20,
      }),
    ]);
    const service = new GetRepairSummaryService(repository);

    const summary = await service.execute({ status: "PENDING" });

    expect(summary.stats.totalRepairs).toBe(1);
    expect(summary.stats.totalRepairCost).toBe(10);
    expect(summary.statusCounts.PENDING).toBe(1);
    expect(summary.statusCounts.COMPLETED).toBe(0);
  });

  it("returns zeroed summary for empty dataset", async () => {
    const repository = new InMemoryRepairRepository();
    repository.seed([]);
    const service = new GetRepairSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRepairs).toBe(0);
    expect(summary.stats.totalRepairCost).toBe(0);
    expect(summary.statusCounts.all).toBe(0);
  });

  it("matches list filter semantics via product and warehouse filters", async () => {
    const repository = createSeededRepairRepository([
      buildRepairEntity({
        productId: PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        status: "PENDING",
      }),
      buildRepairEntity({
        id: OTHER_REPAIR_ID,
        productId: "880e8400-e29b-41d4-a716-446655440099" as typeof PRODUCT_ID,
        warehouseId: WAREHOUSE_ID,
        status: "PENDING",
      }),
    ]);
    const service = new GetRepairSummaryService(repository);

    const summary = await service.execute({ productId: PRODUCT_ID });

    expect(summary.stats.totalRepairs).toBe(1);
  });
});
