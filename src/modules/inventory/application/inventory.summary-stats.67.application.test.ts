import { describe, expect, it } from "vitest";

import { GetInventorySummaryService } from "@/modules/inventory/application/services/get-inventory-summary.service";
import { computeInventorySummaryResult } from "@/modules/inventory/domain/inventory-summary.rules";
import type { InventoryId } from "@/shared/domain/ids";

import {
  buildInventoryEntity,
  INVENTORY_ID,
  OTHER_INVENTORY_ID,
  OTHER_PRODUCT_ID,
  OTHER_WAREHOUSE_ID,
  PRODUCT_ID,
  WAREHOUSE_ID,
} from "../tests/helpers/inventory.fixtures";
import { InMemoryInventoryRepository } from "../tests/helpers/in-memory-inventory.repository";

function buildManyInventoryRecords(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildInventoryEntity({
      id: `880e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}` as InventoryId,
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 10,
      reservedQuantity: 2,
      minimumStock: 5,
      maximumStock: 100,
    }),
  );
}

function createSeededInventoryRepository(
  items: ReturnType<typeof buildInventoryEntity>[],
) {
  const repository = new InMemoryInventoryRepository();
  repository.seed(items);
  return repository;
}

describe("N-39-PATTERN-01 Batch 2 — inventory summary stats completeness", () => {
  it("returns correct summary for exactly 100 inventory records", async () => {
    const repository = createSeededInventoryRepository(buildManyInventoryRecords(100));
    const service = new GetInventorySummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRecords).toBe(100);
    expect(summary.stockStatusCounts.all).toBe(100);
  });

  it("returns correct summary for 101 inventory records (pagination boundary)", async () => {
    const repository = createSeededInventoryRepository(buildManyInventoryRecords(101));
    const service = new GetInventorySummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRecords).toBe(101);
    expect(summary.stockStatusCounts.all).toBe(101);
  });

  it("returns correct summary for 150 inventory records", async () => {
    const repository = createSeededInventoryRepository(buildManyInventoryRecords(150));
    const service = new GetInventorySummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRecords).toBe(150);
    expect(summary.stats.totalOnHand).toBe(1500);
    expect(summary.stats.totalAvailable).toBe(1200);
  });

  it("counts stock statuses across the full dataset", async () => {
    const items = [
      buildInventoryEntity({
        id: INVENTORY_ID,
        quantityOnHand: 100,
        reservedQuantity: 10,
        minimumStock: 5,
        maximumStock: 500,
      }),
      buildInventoryEntity({
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: OTHER_WAREHOUSE_ID,
        quantityOnHand: 3,
        reservedQuantity: 0,
        minimumStock: 5,
        maximumStock: 100,
      }),
      buildInventoryEntity({
        id: "880e8400-e29b-41d4-a716-446655440002" as InventoryId,
        productId: OTHER_PRODUCT_ID,
        warehouseId: OTHER_WAREHOUSE_ID,
        quantityOnHand: 0,
        reservedQuantity: 0,
        minimumStock: 5,
        maximumStock: 100,
      }),
    ];
    const repository = createSeededInventoryRepository(items);
    const service = new GetInventorySummaryService(repository);

    const summary = await service.execute({});
    const expected = computeInventorySummaryResult(
      items.map((item) => ({
        quantityOnHand: item.quantityOnHand,
        reservedQuantity: item.reservedQuantity,
        minimumStock: item.minimumStock,
        maximumStock: item.maximumStock,
      })),
    );

    expect(summary).toEqual(expected);
    expect(summary.stats.lowStockCount).toBe(1);
    expect(summary.stats.outOfStockCount).toBe(1);
  });

  it("applies warehouse filter to summary counts", async () => {
    const repository = createSeededInventoryRepository([
      buildInventoryEntity({ warehouseId: WAREHOUSE_ID }),
      buildInventoryEntity({
        id: OTHER_INVENTORY_ID,
        productId: OTHER_PRODUCT_ID,
        warehouseId: OTHER_WAREHOUSE_ID,
      }),
    ]);
    const service = new GetInventorySummaryService(repository);

    const summary = await service.execute({ warehouseId: WAREHOUSE_ID });

    expect(summary.stats.totalRecords).toBe(1);
  });

  it("returns zeroed summary for empty dataset", async () => {
    const repository = new InMemoryInventoryRepository();
    repository.seed([]);
    const service = new GetInventorySummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalRecords).toBe(0);
    expect(summary.stockStatusCounts.all).toBe(0);
    expect(summary.stats.totalOnHand).toBe(0);
  });
});
