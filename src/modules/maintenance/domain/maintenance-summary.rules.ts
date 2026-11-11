import {
  MAINTENANCE_SEARCH_FIELDS,
  MAINTENANCE_SERVICE_TYPES,
  MAINTENANCE_STATUSES,
} from "./maintenance.constants";
import type { Maintenance } from "./maintenance.entity";
import type { MaintenanceSummaryQuery } from "./maintenance-summary.query";
import type {
  MaintenanceSummaryProjection,
  MaintenanceSummaryResult,
  MaintenanceSummaryServiceTypeCounts,
  MaintenanceSummaryStats,
  MaintenanceSummaryStatusCounts,
} from "./maintenance-summary.types";

export function matchesMaintenanceSummaryQuery(
  record: Pick<
    Maintenance,
    | "status"
    | "productId"
    | "warehouseId"
    | "inventoryId"
    | "serviceType"
    | "scheduledDate"
    | "technician"
    | "maintenanceNumber"
    | "notes"
    | "vendor"
  >,
  query: MaintenanceSummaryQuery,
): boolean {
  if (query.status !== undefined && record.status !== query.status) {
    return false;
  }

  if (query.productId !== undefined && record.productId !== query.productId) {
    return false;
  }

  if (
    query.warehouseId !== undefined &&
    record.warehouseId !== query.warehouseId
  ) {
    return false;
  }

  if (
    query.inventoryId !== undefined &&
    record.inventoryId !== query.inventoryId
  ) {
    return false;
  }

  if (
    query.serviceType !== undefined &&
    record.serviceType !== query.serviceType
  ) {
    return false;
  }

  if (
    query.scheduledDateFrom !== undefined &&
    record.scheduledDate < query.scheduledDateFrom
  ) {
    return false;
  }

  if (
    query.scheduledDateTo !== undefined &&
    record.scheduledDate > query.scheduledDateTo
  ) {
    return false;
  }

  if (query.technician !== undefined) {
    const term = query.technician.trim().toLowerCase();
    if (
      term.length > 0 &&
      !(record.technician?.toLowerCase().includes(term) ?? false)
    ) {
      return false;
    }
  }

  if (query.search !== undefined) {
    const term = query.search.toLowerCase();
    const matchesSearch = MAINTENANCE_SEARCH_FIELDS.some((field) => {
      const value = record[field as keyof typeof record];
      return typeof value === "string" && value.toLowerCase().includes(term);
    });

    if (!matchesSearch) {
      return false;
    }
  }

  return true;
}

export function filterMaintenancesForSummary(
  records: Maintenance[],
  query: MaintenanceSummaryQuery,
): Maintenance[] {
  return records.filter((item) => matchesMaintenanceSummaryQuery(item, query));
}

export function computeMaintenanceSummaryResult(
  records: MaintenanceSummaryProjection[],
): MaintenanceSummaryResult {
  let scheduledCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalEstimatedCost = 0;

  const statusCounts = Object.fromEntries(
    MAINTENANCE_STATUSES.map((status) => [status, 0]),
  ) as Omit<MaintenanceSummaryStatusCounts, "all">;

  const serviceTypeCounts = Object.fromEntries(
    MAINTENANCE_SERVICE_TYPES.map((serviceType) => [serviceType, 0]),
  ) as Omit<MaintenanceSummaryServiceTypeCounts, "all">;

  for (const record of records) {
    statusCounts[record.status] += 1;
    serviceTypeCounts[record.serviceType] += 1;
    totalEstimatedCost += record.estimatedCost;

    switch (record.status) {
      case "SCHEDULED":
        scheduledCount += 1;
        break;
      case "IN_PROGRESS":
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

  const stats: MaintenanceSummaryStats = {
    totalRecords: records.length,
    activeRecords: records.length - cancelledCount,
    pendingActionCount: scheduledCount + inProgressCount,
    scheduledCount,
    inProgressCount,
    completedCount,
    totalEstimatedCost,
  };

  return {
    stats,
    statusCounts: {
      all: records.length,
      ...statusCounts,
    },
    serviceTypeCounts: {
      all: records.length,
      ...serviceTypeCounts,
    },
  };
}
