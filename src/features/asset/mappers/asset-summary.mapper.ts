import type { AssetResponse, AssetStatus } from "../types";
import { parseMoney } from "./asset-form.mapper";

export type AssetSummaryStats = {
  totalAssets: number;
  activeCount: number;
  underMaintenanceCount: number;
  disposedCount: number;
  totalBookValue: number;
};

export function computeAssetSummary(assets: AssetResponse[]): AssetSummaryStats {
  let activeCount = 0;
  let underMaintenanceCount = 0;
  let disposedCount = 0;
  let totalBookValue = 0;

  for (const asset of assets) {
    totalBookValue += parseMoney(asset.currentBookValue);

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

  return {
    totalAssets: assets.length,
    activeCount,
    underMaintenanceCount,
    disposedCount,
    totalBookValue,
  };
}

export function computeAssetStatusCounts(
  assets: AssetResponse[],
): Partial<Record<"all" | AssetStatus, number>> {
  const counts: Partial<Record<"all" | AssetStatus, number>> = {
    all: assets.length,
    ACTIVE: 0,
    UNDER_MAINTENANCE: 0,
    TRANSFERRED: 0,
    DISPOSED: 0,
  };

  for (const asset of assets) {
    counts[asset.status] = (counts[asset.status] ?? 0) + 1;
  }

  return counts;
}
