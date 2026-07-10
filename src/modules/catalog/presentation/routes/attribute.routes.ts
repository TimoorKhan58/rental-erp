export const ATTRIBUTE_ROUTES = {
  base: "/api/product-attributes",
  byId: (id: string) => `/api/product-attributes/${id}`,
} as const;

export type AttributeRouteKey = keyof typeof ATTRIBUTE_ROUTES;
