export const DISPATCH_ROUTES = {
  base: "/api/dispatches",
  byId: (id: string) => `/api/dispatches/${id}`,
  complete: (id: string) => `/api/dispatches/${id}/complete`,
  cancel: (id: string) => `/api/dispatches/${id}/cancel`,
} as const;

export type DispatchRouteKey = keyof typeof DISPATCH_ROUTES;
