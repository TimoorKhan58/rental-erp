import type {
  RentalOrderSummaryResult,
  RentalOrderSummaryStats,
  RentalOrderSummaryStatusCounts,
  RentalOrderSummaryReservationStatusCounts,
} from "@/modules/rental-order/domain/rental-order-summary.types";

export type RentalOrderSummaryStatsDto = RentalOrderSummaryStats;
export type RentalOrderSummaryStatusCountsDto = RentalOrderSummaryStatusCounts;
export type RentalOrderSummaryReservationStatusCountsDto =
  RentalOrderSummaryReservationStatusCounts;
export type RentalOrderSummaryDto = RentalOrderSummaryResult;

export function toRentalOrderSummaryDto(
  result: RentalOrderSummaryResult,
): RentalOrderSummaryDto {
  return result;
}
