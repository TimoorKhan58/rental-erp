import type {
  MaintenanceServiceType,
  MaintenanceStatus,
} from "./maintenance.constants";

export interface MaintenanceSummaryStats {
  totalRecords: number;
  activeRecords: number;
  pendingActionCount: number;
  scheduledCount: number;
  inProgressCount: number;
  completedCount: number;
  totalEstimatedCost: number;
}

export type MaintenanceSummaryStatusCounts = Record<
  "all" | MaintenanceStatus,
  number
>;

export type MaintenanceSummaryServiceTypeCounts = Record<
  "all" | MaintenanceServiceType,
  number
>;

export interface MaintenanceSummaryResult {
  stats: MaintenanceSummaryStats;
  statusCounts: MaintenanceSummaryStatusCounts;
  serviceTypeCounts: MaintenanceSummaryServiceTypeCounts;
}

export type MaintenanceSummaryProjection = {
  status: MaintenanceStatus;
  serviceType: MaintenanceServiceType;
  estimatedCost: number;
};
