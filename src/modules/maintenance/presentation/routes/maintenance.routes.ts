export const MAINTENANCE_ROUTES = {
  base: "/api/maintenances",
  byId: (id: string) => `/api/maintenances/${id}`,
  start: (id: string) => `/api/maintenances/${id}/start`,
  complete: (id: string) => `/api/maintenances/${id}/complete`,
  cancel: (id: string) => `/api/maintenances/${id}/cancel`,
} as const;

export type MaintenanceRouteKey = keyof typeof MAINTENANCE_ROUTES;
