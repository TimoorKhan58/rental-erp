import type { DashboardTheme } from "@/modules/dashboard/domain/dashboard.constants";

export interface DashboardWidgetLayoutDto {
  widgetId: string;
  row: number;
  column: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface DashboardLayoutContentDto {
  version: number;
  theme: DashboardTheme;
  collapsedSections: string[];
  widgets: DashboardWidgetLayoutDto[];
}

export interface DashboardLayoutDto {
  id: string;
  userId: string;
  dashboardId: string;
  dashboardCode: string;
  isCustomized: boolean;
  layout: DashboardLayoutContentDto;
  createdAt: string;
  updatedAt: string;
}
