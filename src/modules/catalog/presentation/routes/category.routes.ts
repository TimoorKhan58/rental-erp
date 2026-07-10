export const CATEGORY_ROUTES = {
  base: "/api/categories",
  byId: (id: string) => `/api/categories/${id}`,
} as const;

export type CategoryRouteKey = keyof typeof CATEGORY_ROUTES;
