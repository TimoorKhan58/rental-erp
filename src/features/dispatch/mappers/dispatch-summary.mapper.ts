import type { DispatchResponse, DispatchStatus } from "../types";
import {
  getOperatorDispatchWorkflowIndex,
  getOperatorDispatchWorkflowProgress as getOperatorProgress,
} from "./dispatch-workflow-presentation.mapper";

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

/** Operator workflow step index (0 = prepare … 2 = complete). Not the raw domain status ordinal. */
export function getDispatchWorkflowStep(status: DispatchStatus): number {
  return getOperatorDispatchWorkflowIndex(status);
}

export function getDispatchTotalQuantity(dispatch: DispatchResponse): number {
  return dispatch.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getDispatchWorkflowProgress(status: DispatchStatus): number {
  return getOperatorProgress(status);
}
