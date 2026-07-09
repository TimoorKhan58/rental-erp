export const PURCHASE_ORDER_ROUTES = {
  base: "/api/purchase-orders",
  byId: (id: string) => `/api/purchase-orders/${id}`,
  approve: (id: string) => `/api/purchase-orders/${id}/approve`,
  receive: (id: string) => `/api/purchase-orders/${id}/receive`,
  cancel: (id: string) => `/api/purchase-orders/${id}/cancel`,
} as const;

export type PurchaseOrderRouteKey = keyof typeof PURCHASE_ORDER_ROUTES;
