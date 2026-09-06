import type { RepairSummaryResult } from "@/modules/repair/domain/repair-summary.types";

export type RepairSummaryDto = RepairSummaryResult;

export function toRepairSummaryDto(
  result: RepairSummaryResult,
): RepairSummaryDto {
  return result;
}
