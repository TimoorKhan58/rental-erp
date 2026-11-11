import type { ReturnStatus } from "./return.constants";

export interface ReturnSummaryStats {
  totalReturns: number;
  activeReturns: number;
  pendingActionCount: number;
  awaitingInspectionCount: number;
  completedCount: number;
  totalReturnedUnits: number;
}

export type ReturnSummaryStatusCounts = Record<"all" | ReturnStatus, number>;

export interface ReturnSummaryResult {
  stats: ReturnSummaryStats;
  statusCounts: ReturnSummaryStatusCounts;
}

export type ReturnSummaryProjection = {
  status: ReturnStatus;
  totalReturnedUnits: number;
};
