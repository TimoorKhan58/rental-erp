/**
 * Warehouse API route definitions.
 */

export const WAREHOUSE_ROUTES = {
  base: "/api/warehouses",
  byId: (id: string) => `/api/warehouses/${id}`,
} as const;

export type WarehouseRouteKey = keyof typeof WAREHOUSE_ROUTES;
