export const RETURN_ROUTES = {
  base: "/api/returns",
  summary: "/api/returns/summary",
  byId: (id: string) => `/api/returns/${id}`,
  receive: (id: string) => `/api/returns/${id}/receive`,
  inspect: (id: string) => `/api/returns/${id}/inspect`,
  complete: (id: string) => `/api/returns/${id}/complete`,
  cancel: (id: string) => `/api/returns/${id}/cancel`,
} as const;

export type ReturnRouteKey = keyof typeof RETURN_ROUTES;
