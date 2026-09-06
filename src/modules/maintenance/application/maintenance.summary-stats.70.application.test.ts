import { describe, expect, it } from "vitest";

import { GetMaintenanceSummaryService } from "@/modules/maintenance/application/services/get-maintenance-summary.service";
import type { MaintenanceId } from "@/shared/domain/ids";

import {
  buildMaintenanceEntity,
  MAINTENANCE_ID,
  OTHER_MAINTENANCE_ID,
  PRODUCT_ID,
} from "../tests/helpers/maintenance.fixtures";
import { InMemoryMaintenanceRepository } from "../tests/helpers/in-memory-maintenance.repository";

function buildManyScheduledMaintenances(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildMaintenanceEntity({
      id: `aa0e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}` as MaintenanceId,
      status: "SCHEDULED",
      estimatedCost: 25,
    }),
  );
}

function createSeededMaintenanceRepository(
  records: ReturnType<typeof buildMaintenanceEntity>[],
) {
  const repository = new InMemoryMaintenanceRepository();
  repository.seed(records);
  return repository;
}

describe("N-39-PATTERN-01 Batch 3 — maintenance summary stats completeness", () => {
  it("returns correct summary for exactly 100 maintenances", async () => {
    const repository = createSeededMaintenanceRepository(
      buildManyScheduledMaintenances(100),
    );
    const service = new GetMaintenanceSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRecords).toBe(100);
    expect(summary.stats.totalEstimatedCost).toBe(2500);
  });

  it("returns correct summary for 101 maintenances (pagination boundary)", async () => {
    const repository = createSeededMaintenanceRepository(
      buildManyScheduledMaintenances(101),
    );
    const service = new GetMaintenanceSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRecords).toBe(101);
    expect(summary.stats.totalEstimatedCost).toBe(2525);
  });

  it("returns correct summary for 150 maintenances", async () => {
    const repository = createSeededMaintenanceRepository(
      buildManyScheduledMaintenances(150),
    );
    const service = new GetMaintenanceSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRecords).toBe(150);
    expect(summary.stats.totalEstimatedCost).toBe(3750);
  });

  it("applies status filter to estimated cost", async () => {
    const repository = createSeededMaintenanceRepository([
      buildMaintenanceEntity({
        id: MAINTENANCE_ID,
        status: "SCHEDULED",
        estimatedCost: 40,
      }),
      buildMaintenanceEntity({
        id: OTHER_MAINTENANCE_ID,
        status: "COMPLETED",
        estimatedCost: 90,
      }),
    ]);
    const service = new GetMaintenanceSummaryService(repository);

    const summary = await service.execute({ status: "SCHEDULED" });

    expect(summary.stats.totalRecords).toBe(1);
    expect(summary.stats.totalEstimatedCost).toBe(40);
  });

  it("returns zeroed summary for empty dataset", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([]);
    const service = new GetMaintenanceSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRecords).toBe(0);
    expect(summary.stats.totalEstimatedCost).toBe(0);
  });

  it("matches list filter semantics via productId", async () => {
    const repository = createSeededMaintenanceRepository([
      buildMaintenanceEntity({
        id: MAINTENANCE_ID,
        productId: PRODUCT_ID,
        estimatedCost: 10,
      }),
      buildMaintenanceEntity({
        id: OTHER_MAINTENANCE_ID,
        productId: "880e8400-e29b-41d4-a716-446655440099" as typeof PRODUCT_ID,
        estimatedCost: 99,
      }),
    ]);
    const service = new GetMaintenanceSummaryService(repository);

    const summary = await service.execute({ productId: PRODUCT_ID });

    expect(summary.stats.totalRecords).toBe(1);
    expect(summary.stats.totalEstimatedCost).toBe(10);
  });
});
