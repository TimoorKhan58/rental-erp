import { REPAIR_SEARCH_FIELDS, REPAIR_STATUSES } from "./repair.constants";
import type { Repair } from "./repair.entity";
import type { RepairSummaryQuery } from "./repair-summary.query";
import type {
  RepairSummaryProjection,
  RepairSummaryResult,
  RepairSummaryStats,
  RepairSummaryStatusCounts,
} from "./repair-summary.types";

export function matchesRepairSummaryQuery(
  repair: Pick<
    Repair,
    | "status"
    | "returnId"
    | "productId"
    | "warehouseId"
    | "repairDate"
    | "technician"
    | "repairNumber"
    | "repairNotes"
  >,
  query: RepairSummaryQuery,
): boolean {
  if (query.status !== undefined && repair.status !== query.status) {
    return false;
  }

  if (query.returnId !== undefined && repair.returnId !== query.returnId) {
    return false;
  }

  if (query.productId !== undefined && repair.productId !== query.productId) {
    return false;
  }

  if (query.warehouseId !== undefined && repair.warehouseId !== query.warehouseId) {
    return false;
  }

  if (
    query.repairDateFrom !== undefined &&
    repair.repairDate < query.repairDateFrom
  ) {
    return false;
  }

  if (query.repairDateTo !== undefined && repair.repairDate > query.repairDateTo) {
    return false;
  }

  if (query.technician !== undefined) {
    const term = query.technician.trim().toLowerCase();
    if (
      term.length > 0 &&
      !(repair.technician?.toLowerCase().includes(term) ?? false)
    ) {
      return false;
    }
  }

  if (query.search !== undefined) {
    const term = query.search.toLowerCase();
    const matchesSearch = REPAIR_SEARCH_FIELDS.some((field) => {
      if (field === "repairNumber") {
        return repair.repairNumber.toLowerCase().includes(term);
      }
      if (field === "remarks") {
        return repair.repairNotes?.toLowerCase().includes(term) ?? false;
      }
      if (field === "assignedTo") {
        return repair.technician?.toLowerCase().includes(term) ?? false;
      }
      return false;
    });

    if (!matchesSearch) {
      return false;
    }
  }

  return true;
}

export function filterRepairsForSummary(
  repairs: Repair[],
  query: RepairSummaryQuery,
): Repair[] {
  return repairs.filter((repair) => matchesRepairSummaryQuery(repair, query));
}

export function computeRepairSummaryResult(
  repairs: RepairSummaryProjection[],
): RepairSummaryResult {
  let pendingCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalRepairCost = 0;

  const statusCounts = Object.fromEntries(
    REPAIR_STATUSES.map((status) => [status, 0]),
  ) as Omit<RepairSummaryStatusCounts, "all">;

  for (const repair of repairs) {
    if ((REPAIR_STATUSES as readonly string[]).includes(repair.status)) {
      statusCounts[repair.status as keyof typeof statusCounts] += 1;
    }

    totalRepairCost += repair.repairCost;

    switch (repair.status) {
      case "PENDING":
        pendingCount += 1;
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
      default:
        break;
    }
  }

  const stats: RepairSummaryStats = {
    totalRepairs: repairs.length,
    activeRepairs: repairs.length - cancelledCount,
    pendingActionCount: pendingCount + inProgressCount,
    pendingCount,
    inProgressCount,
    completedCount,
    totalRepairCost,
  };

  return {
    stats,
    statusCounts: {
      all: repairs.length,
      ...statusCounts,
    },
  };
}
