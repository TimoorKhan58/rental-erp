export const EXPENSE_ROUTES = {
  base: "/api/expenses",
  byId: (id: string) => `/api/expenses/${id}`,
  submit: (id: string) => `/api/expenses/${id}/submit`,
  approve: (id: string) => `/api/expenses/${id}/approve`,
  reject: (id: string) => `/api/expenses/${id}/reject`,
  pay: (id: string) => `/api/expenses/${id}/pay`,
} as const;

export type ExpenseRouteKey = keyof typeof EXPENSE_ROUTES;
