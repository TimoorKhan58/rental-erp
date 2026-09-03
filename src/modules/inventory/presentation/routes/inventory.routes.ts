/**
 * Inventory API route definitions.
 */

export const INVENTORY_ROUTES = {
  base: "/api/inventory",
  summary: "/api/inventory/summary",
  byId: (id: string) => `/api/inventory/${id}`,
} as const;

export type InventoryRouteKey = keyof typeof INVENTORY_ROUTES;
