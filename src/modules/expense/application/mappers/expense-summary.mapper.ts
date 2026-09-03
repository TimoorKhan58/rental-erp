import type { ExpenseCategoryId, SupplierId } from "@/shared/domain/ids";

import type { GetExpenseSummaryInput } from "../schemas/get-expense-summary.schema";

export function toExpenseSummaryQuery(input: GetExpenseSummaryInput) {
  return {
    search: input.search,
    status: input.status,
    expenseType: input.expenseType,
    categoryId: input.categoryId as ExpenseCategoryId | undefined,
    supplierId: input.supplierId as SupplierId | undefined,
  };
}
