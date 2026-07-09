import { describe, expect, it } from "vitest";

import { InMemoryMaintenanceRepository } from "./helpers/in-memory-maintenance.repository";
import {
  buildCreateMaintenanceData,
  buildInProgressMaintenanceEntity,
  buildMaintenanceEntity,
  INVENTORY_ID,
  MAINTENANCE_ID,
  PRODUCT_ID,
  WAREHOUSE_ID,
} from "./helpers/maintenance.fixtures";

describe("InMemoryMaintenanceRepository", () => {
  it("finds by maintenance number", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([buildMaintenanceEntity()]);

    const found = await repository.findByMaintenanceNumber("MNT-2026-001");

    expect(found?.id).toBe(MAINTENANCE_ID);
  });

  it("updates scheduled maintenance fields", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([buildMaintenanceEntity()]);

    const updated = await repository.update(MAINTENANCE_ID, {
      notes: "Updated notes",
      estimatedCost: 150,
    });

    expect(updated.notes).toBe("Updated notes");
    expect(updated.estimatedCost).toBe(150);
  });

  it("updates status with timestamps", async () => {
    const repository = new InMemoryMaintenanceRepository();
    const maintenance = buildMaintenanceEntity();
    repository.seed([maintenance]);
    const startedAt = new Date("2026-01-18T10:00:00.000Z");

    const updated = await repository.updateStatus(maintenance.id, {
      status: "IN_PROGRESS",
      startedAt,
    });

    expect(updated.status).toBe("IN_PROGRESS");
    expect(updated.startedAt).toEqual(startedAt);
  });

  it("filters paged results by status", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([
      buildMaintenanceEntity(),
      buildInProgressMaintenanceEntity(),
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

  it("creates maintenance in scheduled status", async () => {
    const repository = new InMemoryMaintenanceRepository();

    const created = await repository.create(buildCreateMaintenanceData());

    expect(created.status).toBe("SCHEDULED");
    expect(repository.count()).toBe(1);
  });

  it("filters paged results by product id", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([buildMaintenanceEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      productId: PRODUCT_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters paged results by warehouse id", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([buildMaintenanceEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      warehouseId: WAREHOUSE_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters paged results by inventory id", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([buildMaintenanceEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      inventoryId: INVENTORY_ID,
    });

    expect(result.items).toHaveLength(1);
  });

  it("filters paged results by search term", async () => {
    const repository = new InMemoryMaintenanceRepository();
    repository.seed([buildMaintenanceEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      search: "MNT-2026",
    });

    expect(result.items).toHaveLength(1);
  });

  it("sorts paged results by scheduled date", async () => {
    const repository = new InMemoryMaintenanceRepository();
    const earlier = buildMaintenanceEntity();
    const later = buildMaintenanceEntity({
      id: "aa0e8400-e29b-41d4-a716-446655440002" as typeof MAINTENANCE_ID,
    });
    repository.seed([later, earlier]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "asc",
      sortBy: "scheduledDate",
    });

    expect(result.items).toHaveLength(2);
  });
});
