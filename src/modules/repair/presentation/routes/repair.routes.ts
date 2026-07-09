export const REPAIR_ROUTES = {
  base: "/api/repairs",
  byId: (id: string) => `/api/repairs/${id}`,
  start: (id: string) => `/api/repairs/${id}/start`,
  complete: (id: string) => `/api/repairs/${id}/complete`,
  cancel: (id: string) => `/api/repairs/${id}/cancel`,
} as const;

export type RepairRouteKey = keyof typeof REPAIR_ROUTES;
