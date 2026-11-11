import { describe, expect, it } from "vitest";

import { GetAssetSummaryService } from "@/modules/asset/application/services/get-asset-summary.service";
import { computeAssetSummaryResult } from "@/modules/asset/domain/asset-summary.rules";
import type { AssetId } from "@/shared/domain/ids";

import {
  ASSET_ID,
  buildAssetEntity,
  CATEGORY_ID,
  OTHER_ASSET_ID,
  OTHER_CATEGORY_ID,
} from "../tests/helpers/asset.fixtures";
import { InMemoryAssetRepository } from "../tests/helpers/in-memory-asset.repository";

function buildManyActiveAssets(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildAssetEntity({
      id: `aa0e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}` as AssetId,
      assetCode: `AST-${String(index + 1).padStart(3, "0")}`,
      status: "ACTIVE",
      currentBookValue: 1000,
    }),
  );
}

function createSeededAssetRepository(assets: ReturnType<typeof buildAssetEntity>[]) {
  const repository = new InMemoryAssetRepository();
  repository.seed(assets);
  return repository;
}

describe("N-39-PATTERN-01 Batch 2 — asset summary stats completeness", () => {
  it("returns correct summary for exactly 100 assets", async () => {
    const repository = createSeededAssetRepository(buildManyActiveAssets(100));
    const service = new GetAssetSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalAssets).toBe(100);
    expect(summary.statusCounts.all).toBe(100);
    expect(summary.statusCounts.ACTIVE).toBe(100);
  });

  it("returns correct summary for 101 assets (pagination boundary)", async () => {
    const repository = createSeededAssetRepository(buildManyActiveAssets(101));
    const service = new GetAssetSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalAssets).toBe(101);
    expect(summary.statusCounts.all).toBe(101);
  });

  it("returns correct summary for 150 assets", async () => {
    const repository = createSeededAssetRepository(buildManyActiveAssets(150));
    const service = new GetAssetSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalAssets).toBe(150);
    expect(summary.stats.activeCount).toBe(150);
    expect(summary.stats.totalBookValue).toBe(150_000);
  });

  it("counts each status and book value across the full dataset", async () => {
    const assets = [
      buildAssetEntity({
        id: ASSET_ID,
        status: "ACTIVE",
        currentBookValue: 5000,
      }),
      buildAssetEntity({
        id: OTHER_ASSET_ID,
        status: "UNDER_MAINTENANCE",
        currentBookValue: 3000,
      }),
      buildAssetEntity({
        id: "aa0e8400-e29b-41d4-a716-446655440002" as AssetId,
        assetCode: "AST-999",
        status: "DISPOSED",
        currentBookValue: 0,
      }),
    ];
    const repository = createSeededAssetRepository(assets);
    const service = new GetAssetSummaryService(repository);

    const summary = await service.execute({});
    const expected = computeAssetSummaryResult(
      assets.map((asset) => ({
        status: asset.status,
        currentBookValue: asset.currentBookValue,
      })),
    );

    expect(summary).toEqual(expected);
    expect(summary.stats.activeCount).toBe(1);
    expect(summary.stats.underMaintenanceCount).toBe(1);
    expect(summary.stats.disposedCount).toBe(1);
  });

  it("applies status filter to summary counts", async () => {
    const repository = createSeededAssetRepository([
      buildAssetEntity({ status: "ACTIVE" }),
      buildAssetEntity({
        id: OTHER_ASSET_ID,
        assetCode: "AST-002",
        status: "DISPOSED",
        currentBookValue: 0,
      }),
    ]);
    const service = new GetAssetSummaryService(repository);

    const summary = await service.execute({ status: "ACTIVE" });

    expect(summary.stats.totalAssets).toBe(1);
    expect(summary.statusCounts.ACTIVE).toBe(1);
    expect(summary.statusCounts.DISPOSED).toBe(0);
  });

  it("returns zeroed summary for empty dataset", async () => {
    const repository = new InMemoryAssetRepository();
    repository.seed([]);
    const service = new GetAssetSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalAssets).toBe(0);
    expect(summary.statusCounts.all).toBe(0);
    expect(summary.stats.totalBookValue).toBe(0);
  });

  it("matches list filter semantics via shared summary query rules", async () => {
    const repository = createSeededAssetRepository([
      buildAssetEntity({ categoryId: CATEGORY_ID, status: "ACTIVE" }),
      buildAssetEntity({
        id: OTHER_ASSET_ID,
        assetCode: "AST-003",
        categoryId: OTHER_CATEGORY_ID,
        status: "ACTIVE",
      }),
    ]);
    const service = new GetAssetSummaryService(repository);

    const summary = await service.execute({ categoryId: CATEGORY_ID });

    expect(summary.stats.totalAssets).toBe(1);
  });
});
