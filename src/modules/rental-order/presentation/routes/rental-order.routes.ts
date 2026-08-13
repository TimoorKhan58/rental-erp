export const RENTAL_ORDER_ROUTES = {
  base: "/api/rental-orders",
  availability: "/api/rental-orders/availability",
  byId: (id: string) => `/api/rental-orders/${id}`,
  confirm: (id: string) => `/api/rental-orders/${id}/confirm`,
  reserve: (id: string) => `/api/rental-orders/${id}/reserve`,
  cancel: (id: string) => `/api/rental-orders/${id}/cancel`,
  shortfall: (id: string) => `/api/rental-orders/${id}/shortfall`,
  externalRental: (id: string) => `/api/rental-orders/${id}/external-rental`,
} as const;

export type RentalOrderRouteKey = keyof typeof RENTAL_ORDER_ROUTES;
