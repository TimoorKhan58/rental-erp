/**
 * Supplier API route definitions.
 */

export const SUPPLIER_ROUTES = {
  base: "/api/suppliers",
  byId: (id: string) => `/api/suppliers/${id}`,
} as const;

export type SupplierRouteKey = keyof typeof SUPPLIER_ROUTES;
