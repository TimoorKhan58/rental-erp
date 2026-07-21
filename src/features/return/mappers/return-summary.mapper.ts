import type { ReturnResponse, ReturnStatus } from "../types";

export type ReturnSummaryStats = {
  totalReturns: number;
  activeReturns: number;
  pendingActionCount: number;
  awaitingInspectionCount: number;
  completedCount: number;
  totalReturnedUnits: number;
};

export function computeReturnSummary(returns: ReturnResponse[]): ReturnSummaryStats {
  let pendingActionCount = 0;
  let awaitingInspectionCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalReturnedUnits = 0;

  for (const returnRecord of returns) {
    totalReturnedUnits += returnRecord.items.reduce(
      (sum, item) => sum + item.returnedQuantity,
      0,
    );

    switch (returnRecord.status) {
      case "DRAFT":
        pendingActionCount += 1;
        break;
      case "RECEIVED":
        pendingActionCount += 1;
        awaitingInspectionCount += 1;
        break;
      case "INSPECTED":
        pendingActionCount += 1;
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
    totalReturns: returns.length,
    activeReturns: returns.length - cancelledCount,
    pendingActionCount,
    awaitingInspectionCount,
    completedCount,
    totalReturnedUnits,
  };
}

export function computeReturnStatusCounts(
  returns: ReturnResponse[],
): Partial<Record<"all" | ReturnStatus, number>> {
  const counts: Partial<Record<"all" | ReturnStatus, number>> = {
    all: returns.length,
    DRAFT: 0,
    RECEIVED: 0,
    INSPECTED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  for (const returnRecord of returns) {
    counts[returnRecord.status] = (counts[returnRecord.status] ?? 0) + 1;
  }

  return counts;
}

const WORKFLOW_STEPS: ReturnStatus[] = ["DRAFT", "RECEIVED", "INSPECTED", "COMPLETED"];

export function getReturnWorkflowStep(status: ReturnStatus): number {
  if (status === "CANCELLED") {
    return -1;
  }

  return WORKFLOW_STEPS.indexOf(status);
}

export function getReturnTotalQuantity(returnRecord: ReturnResponse): number {
  return returnRecord.items.reduce((sum, item) => sum + item.returnedQuantity, 0);
}

export function getReturnWorkflowProgress(status: ReturnStatus): number {
  const step = getReturnWorkflowStep(status);

  if (step < 0) {
    return 0;
  }

  return Math.round(((step + 1) / WORKFLOW_STEPS.length) * 100);
}

export function hasReturnInspection(returnRecord: ReturnResponse): boolean {
  return (
    returnRecord.status === "INSPECTED" ||
    returnRecord.status === "COMPLETED" ||
    returnRecord.inspectedAt !== null
  );
}

export function getReturnDamageTotals(returnRecord: ReturnResponse) {
  return {
    damaged: returnRecord.items.reduce((sum, item) => sum + item.damagedQuantity, 0),
    lost: returnRecord.items.reduce((sum, item) => sum + item.lostQuantity, 0),
    good: returnRecord.items.reduce((sum, item) => sum + item.goodQuantity, 0),
  };
}
