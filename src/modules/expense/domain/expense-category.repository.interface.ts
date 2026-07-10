import type { ExpenseCategoryId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { ExpenseCategory } from "./expense-category.entity";
import type { ExpenseCategoryListQuery } from "./expense-category-list.query";
import type {
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from "./expense-category.types";

export interface IExpenseCategoryRepository {
  findById(id: ExpenseCategoryId): Promise<ExpenseCategory | null>;
  findByName(name: string): Promise<ExpenseCategory | null>;
  findPaged(
    query: ExpenseCategoryListQuery,
  ): Promise<PaginatedResult<ExpenseCategory>>;
  exists(id: ExpenseCategoryId): Promise<boolean>;
  create(data: CreateExpenseCategoryData): Promise<ExpenseCategory>;
  update(
    id: ExpenseCategoryId,
    data: UpdateExpenseCategoryData,
  ): Promise<ExpenseCategory>;
  delete(id: ExpenseCategoryId): Promise<void>;
}
