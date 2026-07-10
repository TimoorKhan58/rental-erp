import type { ExpenseCategoryId, SupplierId } from "@/shared/domain/ids";

import type { ExpenseSortField, ExpenseStatus, ExpenseType } from "./expense.constants";

export interface ExpenseListQuery {
  page: number;
  pageSize: number;
  sortBy?: ExpenseSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: ExpenseStatus;
  expenseType?: ExpenseType;
  categoryId?: ExpenseCategoryId;
  supplierId?: SupplierId;
}
