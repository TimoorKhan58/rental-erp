export const DASHBOARD_ROUTES = {
  layout: "/api/dashboard/layout",
  resetLayout: "/api/dashboard/layout/reset",
} as const;

export type DashboardRouteKey = keyof typeof DASHBOARD_ROUTES;
