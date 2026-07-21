import type {
  MaintenanceResponse,
  MaintenanceServiceType,
  MaintenanceStatus,
} from "../types";

export type MaintenanceSummaryStats = {
  totalRecords: number;
  activeRecords: number;
  pendingActionCount: number;
  scheduledCount: number;
  inProgressCount: number;
  completedCount: number;
  totalEstimatedCost: number;
};

export function computeMaintenanceSummary(
  records: MaintenanceResponse[],
): MaintenanceSummaryStats {
  let pendingActionCount = 0;
  let scheduledCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalEstimatedCost = 0;

  for (const record of records) {
    totalEstimatedCost += record.estimatedCost;

    switch (record.status) {
      case "SCHEDULED":
        pendingActionCount += 1;
        scheduledCount += 1;
        break;
      case "IN_PROGRESS":
        pendingActionCount += 1;
        inProgressCount += 1;
        break;
      case "COMPLETED":
        completedCount += 1;
        break;
      case "CANCELLED":
        cancelledCount += 1;
        break;
    }
  }

  return {
    totalRecords: records.length,
    activeRecords: records.length - cancelledCount,
    pendingActionCount,
    scheduledCount,
    inProgressCount,
    completedCount,
    totalEstimatedCost,
  };
}

export function computeMaintenanceStatusCounts(
  records: MaintenanceResponse[],
): Partial<Record<"all" | MaintenanceStatus, number>> {
  const counts: Partial<Record<"all" | MaintenanceStatus, number>> = {
    all: records.length,
    SCHEDULED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  for (const record of records) {
    counts[record.status] = (counts[record.status] ?? 0) + 1;
  }

  return counts;
}

export function computeMaintenanceServiceTypeCounts(
  records: MaintenanceResponse[],
): Partial<Record<"all" | MaintenanceServiceType, number>> {
  const counts: Partial<Record<"all" | MaintenanceServiceType, number>> = {
    all: records.length,
    PREVENTIVE: 0,
    CLEANING: 0,
    INSPECTION: 0,
    CALIBRATION: 0,
    LUBRICATION: 0,
    OTHER: 0,
  };

  for (const record of records) {
    counts[record.serviceType] = (counts[record.serviceType] ?? 0) + 1;
  }

  return counts;
}

const WORKFLOW_STEPS: MaintenanceStatus[] = ["SCHEDULED", "IN_PROGRESS", "COMPLETED"];

export function getMaintenanceWorkflowStep(status: MaintenanceStatus): number {
  if (status === "CANCELLED") {
    return -1;
  }

  return WORKFLOW_STEPS.indexOf(status);
}

export function getMaintenanceWorkflowProgress(status: MaintenanceStatus): number {
  const step = getMaintenanceWorkflowStep(status);

  if (step < 0) {
    return 0;
  }

  return Math.round(((step + 1) / WORKFLOW_STEPS.length) * 100);
}

export function getMaintenanceDisplayCost(record: MaintenanceResponse): number {
  return record.status === "COMPLETED" && record.actualCost > 0
    ? record.actualCost
    : record.estimatedCost;
}
