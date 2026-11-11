import type {
  DispatchSummaryResult,
  DispatchSummaryStats,
  DispatchSummaryStatusCounts,
} from "@/modules/dispatch/domain/dispatch-summary.types";

export type DispatchSummaryStatsDto = DispatchSummaryStats;
export type DispatchSummaryStatusCountsDto = DispatchSummaryStatusCounts;
export type DispatchSummaryDto = DispatchSummaryResult;

export function toDispatchSummaryDto(
  result: DispatchSummaryResult,
): DispatchSummaryDto {
  return result;
}
