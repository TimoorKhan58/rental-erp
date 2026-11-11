export const PAYMENT_ROUTES = {
  base: "/api/payments",
  summary: "/api/payments/summary",
  byId: (id: string) => `/api/payments/${id}`,
  post: (id: string) => `/api/payments/${id}/post`,
  void: (id: string) => `/api/payments/${id}/void`,
} as const;

export type PaymentRouteKey = keyof typeof PAYMENT_ROUTES;
