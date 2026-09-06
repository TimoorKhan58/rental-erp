import type { ReturnSummaryResult } from "@/modules/return/domain/return-summary.types";

export type ReturnSummaryDto = ReturnSummaryResult;

export function toReturnSummaryDto(
  result: ReturnSummaryResult,
): ReturnSummaryDto {
  return result;
}
