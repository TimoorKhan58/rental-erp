import type { ExpenseCategorySortField } from "./expense-category.constants";

export interface ExpenseCategoryListQuery {
  page: number;
  pageSize: number;
  sortBy?: ExpenseCategorySortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
}
