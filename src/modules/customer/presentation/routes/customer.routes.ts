/**
 * Customer API route definitions.
 * Endpoints will be wired in Phase 5-002.
 */

export const CUSTOMER_ROUTES = {
  base: "/api/customers",
  byId: (id: string) => `/api/customers/${id}`,
} as const;

export type CustomerRouteKey = keyof typeof CUSTOMER_ROUTES;
