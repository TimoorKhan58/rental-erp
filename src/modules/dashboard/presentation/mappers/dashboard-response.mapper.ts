import type { DashboardLayoutDto } from "@/modules/dashboard/application/dtos/dashboard.dto";

export interface DashboardWidgetLayoutResponse {
  widgetId: string;
  row: number;
  column: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface DashboardLayoutContentResponse {
  version: number;
  theme: string;
  collapsedSections: string[];
  widgets: DashboardWidgetLayoutResponse[];
}

export interface DashboardLayoutResponse {
  id: string;
  userId: string;
  dashboardId: string;
  dashboardCode: string;
  isCustomized: boolean;
  layout: DashboardLayoutContentResponse;
  createdAt: string;
  updatedAt: string;
}

export function toDashboardLayoutResponse(
  dto: DashboardLayoutDto,
): DashboardLayoutResponse {
  return {
    id: dto.id,
    userId: dto.userId,
    dashboardId: dto.dashboardId,
    dashboardCode: dto.dashboardCode,
    isCustomized: dto.isCustomized,
    layout: {
      version: dto.layout.version,
      theme: dto.layout.theme,
      collapsedSections: dto.layout.collapsedSections,
      widgets: dto.layout.widgets.map((widget) => ({
        widgetId: widget.widgetId,
        row: widget.row,
        column: widget.column,
        width: widget.width,
        height: widget.height,
        visible: widget.visible,
      })),
    },
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
