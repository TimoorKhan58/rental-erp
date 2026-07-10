export const EXPENSE_CATEGORY_ROUTES = {
  base: "/api/expense-categories",
  byId: (id: string) => `/api/expense-categories/${id}`,
} as const;

export type ExpenseCategoryRouteKey = keyof typeof EXPENSE_CATEGORY_ROUTES;
