export const EXPENSE_CATEGORY_MODULE = "expense-categories";
export const EXPENSE_CATEGORY_ENTITY_NAME = "ExpenseCategory";

export const EXPENSE_CATEGORY_SEARCH_FIELDS = ["name", "description"] as const;

export const EXPENSE_CATEGORY_SORT_FIELDS = [
  "name",
  "isActive",
  "createdAt",
] as const;

export type ExpenseCategorySortField =
  (typeof EXPENSE_CATEGORY_SORT_FIELDS)[number];
