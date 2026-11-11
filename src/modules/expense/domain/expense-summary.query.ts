import type { ExpenseCategoryId, SupplierId } from "@/shared/domain/ids";

import type { ExpenseStatus, ExpenseType } from "./expense.constants";

export interface ExpenseSummaryQuery {
  search?: string;
  status?: ExpenseStatus;
  expenseType?: ExpenseType;
  categoryId?: ExpenseCategoryId;
  supplierId?: SupplierId;
}
