import { DISPATCH_SEARCH_FIELDS } from "./dispatch.constants";
import type { Dispatch } from "./dispatch.entity";
import type { DispatchSummaryQuery } from "./dispatch-summary.query";
import type {
  DispatchSummaryResult,
  DispatchSummaryStats,
  DispatchSummaryStatusCounts,
} from "./dispatch-summary.types";

export function matchesDispatchSummaryQuery(
  dispatch: Dispatch,
  query: DispatchSummaryQuery,
  options?: { rentalOrderWarehouseId?: string },
): boolean {
  if (query.status !== undefined && dispatch.status !== query.status) {
    return false;
  }

  if (
    query.rentalOrderId !== undefined &&
    dispatch.rentalOrderId !== query.rentalOrderId
  ) {
    return false;
  }

  if (query.warehouseId !== undefined) {
    if (options?.rentalOrderWarehouseId !== query.warehouseId) {
      return false;
    }
  }

  if (query.dispatchDateFrom !== undefined) {
    if (dispatch.dispatchDate.getTime() < query.dispatchDateFrom.getTime()) {
      return false;
    }
  }

  if (query.dispatchDateTo !== undefined) {
    if (dispatch.dispatchDate.getTime() > query.dispatchDateTo.getTime()) {
      return false;
    }
  }

  if (query.search !== undefined) {
    const term = query.search.toLowerCase();
    const matchesSearch = DISPATCH_SEARCH_FIELDS.some((field) => {
      const value = dispatch[field as keyof Dispatch];
      return typeof value === "string" && value.toLowerCase().includes(term);
    });

    if (!matchesSearch) {
      return false;
    }
  }

  return true;
}

export function filterDispatchesForSummary(
  dispatches: Dispatch[],
  query: DispatchSummaryQuery,
  options?: { rentalOrderWarehouseById?: Map<string, string> },
): Dispatch[] {
  return dispatches.filter((dispatch) =>
    matchesDispatchSummaryQuery(dispatch, query, {
      rentalOrderWarehouseId: options?.rentalOrderWarehouseById?.get(
        dispatch.rentalOrderId,
      ),
    }),
  );
}

export function computeDispatchSummaryResult(
  dispatches: Dispatch[],
): DispatchSummaryResult {
  let pendingActionCount = 0;
  let inTransitCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalUnits = 0;

  const statusCounts: DispatchSummaryStatusCounts = {
    all: dispatches.length,
    DRAFT: 0,
    READY: 0,
    DISPATCHED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  for (const dispatch of dispatches) {
    totalUnits += dispatch.items.reduce((sum, item) => sum + item.quantity, 0);
    statusCounts[dispatch.status] += 1;

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

  const stats: DispatchSummaryStats = {
    totalDispatches: dispatches.length,
    activeDispatches: dispatches.length - cancelledCount,
    pendingActionCount,
    inTransitCount,
    completedCount,
    totalUnits,
  };

  return { stats, statusCounts };
}
