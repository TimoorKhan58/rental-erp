import type { RepairResponse, RepairStatus } from "../types";

export type RepairSummaryStats = {
  totalRepairs: number;
  activeRepairs: number;
  pendingActionCount: number;
  pendingCount: number;
  inProgressCount: number;
  completedCount: number;
  totalRepairCost: number;
};

export function computeRepairSummary(repairs: RepairResponse[]): RepairSummaryStats {
  let pendingActionCount = 0;
  let pendingCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalRepairCost = 0;

  for (const repair of repairs) {
    totalRepairCost += repair.repairCost;

    switch (repair.status) {
      case "PENDING":
        pendingActionCount += 1;
        pendingCount += 1;
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
    totalRepairs: repairs.length,
    activeRepairs: repairs.length - cancelledCount,
    pendingActionCount,
    pendingCount,
    inProgressCount,
    completedCount,
    totalRepairCost,
  };
}

export function computeRepairStatusCounts(
  repairs: RepairResponse[],
): Partial<Record<"all" | RepairStatus, number>> {
  const counts: Partial<Record<"all" | RepairStatus, number>> = {
    all: repairs.length,
    PENDING: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  for (const repair of repairs) {
    counts[repair.status] = (counts[repair.status] ?? 0) + 1;
  }

  return counts;
}

const WORKFLOW_STEPS: RepairStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

export function getRepairWorkflowStep(status: RepairStatus): number {
  if (status === "CANCELLED") {
    return -1;
  }

  return WORKFLOW_STEPS.indexOf(status);
}

export function getRepairWorkflowProgress(status: RepairStatus): number {
  const step = getRepairWorkflowStep(status);

  if (step < 0) {
    return 0;
  }

  return Math.round(((step + 1) / WORKFLOW_STEPS.length) * 100);
}
