export const AUDIT_ROUTES = {
  base: "/api/audit",
  byId: (id: string) => `/api/audit/${id}`,
} as const;

export type AuditRouteKey = keyof typeof AUDIT_ROUTES;
