export const UNIT_ROUTES = {
  base: "/api/units",
  byId: (id: string) => `/api/units/${id}`,
} as const;

export type UnitRouteKey = keyof typeof UNIT_ROUTES;
