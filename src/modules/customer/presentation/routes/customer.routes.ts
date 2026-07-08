/**
 * Customer API route definitions.
 */

export const CUSTOMER_ROUTES = {
  base: "/api/customers",
  byId: (id: string) => `/api/customers/${id}`,
} as const;

export type CustomerRouteKey = keyof typeof CUSTOMER_ROUTES;
