import type { DispatchStatus } from "./dispatch.constants";

export interface DispatchSummaryStats {
  totalDispatches: number;
  activeDispatches: number;
  pendingActionCount: number;
  inTransitCount: number;
  completedCount: number;
  totalUnits: number;
}

export type DispatchSummaryStatusCounts = Record<"all" | DispatchStatus, number>;

export interface DispatchSummaryResult {
  stats: DispatchSummaryStats;
  statusCounts: DispatchSummaryStatusCounts;
}
