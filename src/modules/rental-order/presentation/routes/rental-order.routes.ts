export const RENTAL_ORDER_ROUTES = {
  base: "/api/rental-orders",
  byId: (id: string) => `/api/rental-orders/${id}`,
  confirm: (id: string) => `/api/rental-orders/${id}/confirm`,
  reserve: (id: string) => `/api/rental-orders/${id}/reserve`,
  cancel: (id: string) => `/api/rental-orders/${id}/cancel`,
} as const;

export type RentalOrderRouteKey = keyof typeof RENTAL_ORDER_ROUTES;
