/**
 * Product API route definitions.
 */

export const PRODUCT_ROUTES = {
  base: "/api/products",
  byId: (id: string) => `/api/products/${id}`,
} as const;

export type ProductRouteKey = keyof typeof PRODUCT_ROUTES;
