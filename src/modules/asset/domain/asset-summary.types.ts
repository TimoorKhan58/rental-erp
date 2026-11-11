import type { AssetStatus } from "./asset.constants";

export interface AssetSummaryStats {
  totalAssets: number;
  activeCount: number;
  underMaintenanceCount: number;
  disposedCount: number;
  totalBookValue: number;
}

export type AssetSummaryStatusCounts = Record<"all" | AssetStatus, number>;

export interface AssetSummaryResult {
  stats: AssetSummaryStats;
  statusCounts: AssetSummaryStatusCounts;
}

export type AssetSummaryProjection = {
  status: AssetStatus;
  currentBookValue: number;
};
