import type { RepairStatus } from "./repair.constants";

export interface RepairSummaryStats {
  totalRepairs: number;
  activeRepairs: number;
  pendingActionCount: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  totalRepairCost: number;
}

export type RepairSummaryStatusCounts = Record<"all" | RepairStatus, number>;

export interface RepairSummaryResult {
  stats: RepairSummaryStats;
  statusCounts: RepairSummaryStatusCounts;
}

export type RepairSummaryProjection = {
  status: RepairStatus;
  repairCost: number;
};
