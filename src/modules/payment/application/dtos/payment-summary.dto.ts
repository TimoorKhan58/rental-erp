import type {
  PaymentSummaryResult,
  PaymentSummaryStats,
  PaymentSummaryStatusCounts,
  PaymentSummaryMethodCounts,
} from "@/modules/payment/domain/payment-summary.types";

export type PaymentSummaryStatsDto = PaymentSummaryStats;
export type PaymentSummaryStatusCountsDto = PaymentSummaryStatusCounts;
export type PaymentSummaryMethodCountsDto = PaymentSummaryMethodCounts;
export type PaymentSummaryDto = PaymentSummaryResult;

export function toPaymentSummaryDto(result: PaymentSummaryResult): PaymentSummaryDto {
  return result;
}
