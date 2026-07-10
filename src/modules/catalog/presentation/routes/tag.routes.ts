export const TAG_ROUTES = {
  base: "/api/product-tags",
  byId: (id: string) => `/api/product-tags/${id}`,
} as const;

export type TagRouteKey = keyof typeof TAG_ROUTES;
