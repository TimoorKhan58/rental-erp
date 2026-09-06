import { RETURN_SEARCH_FIELDS, RETURN_STATUSES } from "./return.constants";
import type { Return } from "./return.entity";
import type { ReturnSummaryQuery } from "./return-summary.query";
import type {
  ReturnSummaryProjection,
  ReturnSummaryResult,
  ReturnSummaryStats,
  ReturnSummaryStatusCounts,
} from "./return-summary.types";

export function matchesReturnSummaryQuery(
  returnRecord: Pick<
    Return,
    | "status"
    | "rentalOrderId"
    | "dispatchId"
    | "returnDate"
    | "returnNumber"
    | "remarks"
  >,
  query: ReturnSummaryQuery,
): boolean {
  if (query.status !== undefined && returnRecord.status !== query.status) {
    return false;
  }

  if (
    query.rentalOrderId !== undefined &&
    returnRecord.rentalOrderId !== query.rentalOrderId
  ) {
    return false;
  }

  if (
    query.dispatchId !== undefined &&
    returnRecord.dispatchId !== query.dispatchId
  ) {
    return false;
  }

  if (
    query.returnDateFrom !== undefined &&
    returnRecord.returnDate < query.returnDateFrom
  ) {
    return false;
  }

  if (
    query.returnDateTo !== undefined &&
    returnRecord.returnDate > query.returnDateTo
  ) {
    return false;
  }

  if (query.search !== undefined) {
    const term = query.search.toLowerCase();
    const matchesSearch = RETURN_SEARCH_FIELDS.some((field) => {
      const value = returnRecord[field as keyof typeof returnRecord];
      return typeof value === "string" && value.toLowerCase().includes(term);
    });

    if (!matchesSearch) {
      return false;
    }
  }

  return true;
}

export function filterReturnsForSummary(
  returns: Return[],
  query: ReturnSummaryQuery,
): Return[] {
  return returns.filter((item) => matchesReturnSummaryQuery(item, query));
}

export function computeReturnSummaryResult(
  returns: ReturnSummaryProjection[],
): ReturnSummaryResult {
  let pendingActionCount = 0;
  let awaitingInspectionCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalReturnedUnits = 0;

  const statusCounts = Object.fromEntries(
    RETURN_STATUSES.map((status) => [status, 0]),
  ) as Omit<ReturnSummaryStatusCounts, "all">;

  for (const returnRecord of returns) {
    statusCounts[returnRecord.status] += 1;
    totalReturnedUnits += returnRecord.totalReturnedUnits;

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

  const stats: ReturnSummaryStats = {
    totalReturns: returns.length,
    activeReturns: returns.length - cancelledCount,
    pendingActionCount,
    awaitingInspectionCount,
    completedCount,
    totalReturnedUnits,
  };

  return {
    stats,
    statusCounts: {
      all: returns.length,
      ...statusCounts,
    },
  };
}
