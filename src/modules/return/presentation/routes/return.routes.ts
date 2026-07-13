export const RETURN_ROUTES = {
  base: "/api/returns",
  byId: (id: string) => `/api/returns/${id}`,
  receive: (id: string) => `/api/returns/${id}/receive`,
  inspect: (id: string) => `/api/returns/${id}/inspect`,
  complete: (id: string) => `/api/returns/${id}/complete`,
  recoverLost: (id: string) => `/api/returns/${id}/recover-lost`,
  cancel: (id: string) => `/api/returns/${id}/cancel`,
} as const;

export type ReturnRouteKey = keyof typeof RETURN_ROUTES;
