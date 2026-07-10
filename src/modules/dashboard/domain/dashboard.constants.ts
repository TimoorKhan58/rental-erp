export const DASHBOARD_MODULE = "dashboard";

export const DASHBOARD_LAYOUT_ENTITY_NAME = "DashboardLayout";

export const DEFAULT_DASHBOARD_CODE = "overview";

export const DEFAULT_LAYOUT_VERSION = 1;

export const DASHBOARD_THEMES = ["light", "dark", "system"] as const;

export const DASHBOARD_WIDGET_IDS = [
  "summary-kpis",
  "rental-orders-overview",
  "inventory-status",
  "dispatch-queue",
  "returns-pending",
  "revenue-summary",
  "expense-summary",
  "recent-payments",
] as const;

export const MIN_WIDGET_COORDINATE = 0;
export const MIN_WIDGET_DIMENSION = 1;
export const MAX_WIDGET_WIDTH = 12;
export const MAX_WIDGET_HEIGHT = 12;

export type DashboardTheme = (typeof DASHBOARD_THEMES)[number];
export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];
