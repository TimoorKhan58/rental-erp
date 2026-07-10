export const ASSET_CATEGORY_ROUTES = {
  base: "/api/asset-categories",
  byId: (id: string) => `/api/asset-categories/${id}`,
} as const;

export type AssetCategoryRouteKey = keyof typeof ASSET_CATEGORY_ROUTES;
