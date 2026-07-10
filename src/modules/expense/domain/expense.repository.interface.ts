import type { ExpenseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Expense } from "./expense.entity";
import type { ExpenseListQuery } from "./expense-list.query";
import type {
  CreateExpenseData,
  UpdateExpenseData,
  UpdateExpenseStatusData,
} from "./expense.types";

export interface IExpenseRepository {
  findById(id: ExpenseId): Promise<Expense | null>;
  findByExpenseNumber(expenseNumber: string): Promise<Expense | null>;
  findPaged(query: ExpenseListQuery): Promise<PaginatedResult<Expense>>;
  create(data: CreateExpenseData): Promise<Expense>;
  update(id: ExpenseId, data: UpdateExpenseData, existing: Expense): Promise<Expense>;
  updateStatus(
    id: ExpenseId,
    data: UpdateExpenseStatusData,
  ): Promise<Expense>;
}
