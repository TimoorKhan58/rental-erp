import { ASSET_SEARCH_FIELDS, ASSET_STATUSES } from "./asset.constants";
import type { Asset } from "./asset.entity";
import type { AssetSummaryQuery } from "./asset-summary.query";
import type {
  AssetSummaryProjection,
  AssetSummaryResult,
  AssetSummaryStats,
  AssetSummaryStatusCounts,
} from "./asset-summary.types";

export function matchesAssetSummaryQuery(
  asset: Pick<
    Asset,
    | "status"
    | "categoryId"
    | "warehouseId"
    | "name"
    | "assetCode"
    | "serialNumber"
    | "notes"
  >,
  query: AssetSummaryQuery,
): boolean {
  if (query.status !== undefined && asset.status !== query.status) {
    return false;
  }

  if (query.categoryId !== undefined && asset.categoryId !== query.categoryId) {
    return false;
  }

  if (query.warehouseId !== undefined && asset.warehouseId !== query.warehouseId) {
    return false;
  }

  if (query.search !== undefined) {
    const term = query.search.toLowerCase();
    const matchesSearch = ASSET_SEARCH_FIELDS.some((field) => {
      const value = asset[field as keyof typeof asset];
      return typeof value === "string" && value.toLowerCase().includes(term);
    });

    if (!matchesSearch) {
      return false;
    }
  }

  return true;
}

export function filterAssetsForSummary(
  assets: Asset[],
  query: AssetSummaryQuery,
): Asset[] {
  return assets.filter((asset) => matchesAssetSummaryQuery(asset, query));
}

export function computeAssetSummaryResult(
  assets: AssetSummaryProjection[],
): AssetSummaryResult {
  let activeCount = 0;
  let underMaintenanceCount = 0;
  let disposedCount = 0;
  let totalBookValue = 0;

  const statusCounts = Object.fromEntries(
    ASSET_STATUSES.map((status) => [status, 0]),
  ) as Omit<AssetSummaryStatusCounts, "all">;

  for (const asset of assets) {
    totalBookValue += asset.currentBookValue;
    statusCounts[asset.status] += 1;

    switch (asset.status) {
      case "ACTIVE":
      case "TRANSFERRED":
        activeCount += 1;
        break;
      case "UNDER_MAINTENANCE":
        underMaintenanceCount += 1;
        break;
      case "DISPOSED":
        disposedCount += 1;
        break;
    }
  }

  const stats: AssetSummaryStats = {
    totalAssets: assets.length,
    activeCount,
    underMaintenanceCount,
    disposedCount,
    totalBookValue,
  };

  return {
    stats,
    statusCounts: {
      all: assets.length,
      ...statusCounts,
    },
  };
}
