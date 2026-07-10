export const BRAND_ROUTES = {
  base: "/api/brands",
  byId: (id: string) => `/api/brands/${id}`,
} as const;

export type BrandRouteKey = keyof typeof BRAND_ROUTES;
