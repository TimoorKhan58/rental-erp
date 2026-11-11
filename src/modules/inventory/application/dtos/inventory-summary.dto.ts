import type { InventorySummaryResult } from "@/modules/inventory/domain/inventory-summary.types";

export type InventorySummaryDto = InventorySummaryResult;

export function toInventorySummaryDto(
  result: InventorySummaryResult,
): InventorySummaryDto {
  return result;
}
