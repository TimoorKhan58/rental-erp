import type { DispatchResponse, DispatchStatus } from "../types";

export type DispatchSummaryStats = {
  totalDispatches: number;
  activeDispatches: number;
  pendingActionCount: number;
  inTransitCount: number;
  completedCount: number;
  totalUnits: number;
};

export function computeDispatchSummary(dispatches: DispatchResponse[]): DispatchSummaryStats {
  let pendingActionCount = 0;
  let inTransitCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalUnits = 0;

  for (const dispatch of dispatches) {
    totalUnits += dispatch.items.reduce((sum, item) => sum + item.quantity, 0);

    switch (dispatch.status) {
      case "DRAFT":
      case "READY":
        pendingActionCount += 1;
        break;
      case "DISPATCHED":
        inTransitCount += 1;
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
    totalDispatches: dispatches.length,
    activeDispatches: dispatches.length - cancelledCount,
    pendingActionCount,
    inTransitCount,
    completedCount,
    totalUnits,
  };
}

export function computeDispatchStatusCounts(
  dispatches: DispatchResponse[],
): Partial<Record<"all" | DispatchStatus, number>> {
  const counts: Partial<Record<"all" | DispatchStatus, number>> = {
    all: dispatches.length,
    DRAFT: 0,
    READY: 0,
    DISPATCHED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  for (const dispatch of dispatches) {
    counts[dispatch.status] = (counts[dispatch.status] ?? 0) + 1;
  }

  return counts;
}

const WORKFLOW_STEPS: DispatchStatus[] = ["DRAFT", "READY", "DISPATCHED", "COMPLETED"];

export function getDispatchWorkflowStep(status: DispatchStatus): number {
  if (status === "CANCELLED") {
    return -1;
  }

  return WORKFLOW_STEPS.indexOf(status);
}

export function getDispatchTotalQuantity(dispatch: DispatchResponse): number {
  return dispatch.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getDispatchWorkflowProgress(status: DispatchStatus): number {
  const step = getDispatchWorkflowStep(status);

  if (step < 0) {
    return 0;
  }

  return Math.round(((step + 1) / WORKFLOW_STEPS.length) * 100);
}
