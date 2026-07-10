export const ASSET_ROUTES = {
  base: "/api/assets",
  byId: (id: string) => `/api/assets/${id}`,
  transfer: (id: string) => `/api/assets/${id}/transfer`,
  dispose: (id: string) => `/api/assets/${id}/dispose`,
  maintenance: (id: string) => `/api/assets/${id}/maintenance`,
} as const;

export type AssetRouteKey = keyof typeof ASSET_ROUTES;
