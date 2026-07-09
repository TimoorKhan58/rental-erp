/**
 * Stock movement API route definitions.
 */

export const STOCK_MOVEMENT_ROUTES = {
  base: "/api/stock-movements",
  byId: (id: string) => `/api/stock-movements/${id}`,
} as const;

export type StockMovementRouteKey = keyof typeof STOCK_MOVEMENT_ROUTES;
