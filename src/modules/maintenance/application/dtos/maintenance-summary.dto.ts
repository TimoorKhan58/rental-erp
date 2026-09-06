import type { MaintenanceSummaryResult } from "@/modules/maintenance/domain/maintenance-summary.types";

export type MaintenanceSummaryDto = MaintenanceSummaryResult;

export function toMaintenanceSummaryDto(
  result: MaintenanceSummaryResult,
): MaintenanceSummaryDto {
  return result;
}
