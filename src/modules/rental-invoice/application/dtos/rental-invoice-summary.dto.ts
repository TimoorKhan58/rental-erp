import type {
  RentalInvoiceSummaryPaymentStatusCounts,
  RentalInvoiceSummaryResult,
  RentalInvoiceSummaryStats,
  RentalInvoiceSummaryStatusCounts,
} from "@/modules/rental-invoice/domain/rental-invoice-summary.types";

export type RentalInvoiceSummaryStatsDto = RentalInvoiceSummaryStats;

export type RentalInvoiceSummaryStatusCountsDto = RentalInvoiceSummaryStatusCounts;

export type RentalInvoiceSummaryPaymentStatusCountsDto =
  RentalInvoiceSummaryPaymentStatusCounts;

export type RentalInvoiceSummaryDto = RentalInvoiceSummaryResult;

export function toRentalInvoiceSummaryDto(
  result: RentalInvoiceSummaryResult,
): RentalInvoiceSummaryDto {
  return result;
}
