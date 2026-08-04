export const SUPPLIER_PAYMENT_ROUTES = {
  base: "/api/supplier-payments",
  byId: (id: string) => `/api/supplier-payments/${id}`,
  post: (id: string) => `/api/supplier-payments/${id}/post`,
  void: (id: string) => `/api/supplier-payments/${id}/void`,
} as const;

export type SupplierPaymentRouteKey = keyof typeof SUPPLIER_PAYMENT_ROUTES;
