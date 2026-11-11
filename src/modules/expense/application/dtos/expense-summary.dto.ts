import type { ExpenseSummaryResult } from "@/modules/expense/domain/expense-summary.types";

export type ExpenseSummaryDto = ExpenseSummaryResult;

export function toExpenseSummaryDto(
  result: ExpenseSummaryResult,
): ExpenseSummaryDto {
  return result;
}
