import type { DashboardLayout } from "@/modules/dashboard/domain/dashboard-layout.entity";
import type {
  CreateDashboardLayoutData,
  DashboardLayoutContent,
  DashboardWidgetLayout,
  UpdateDashboardLayoutData,
} from "@/modules/dashboard/domain/dashboard.types";

import type {
  DashboardLayoutContentDto,
  DashboardLayoutDto,
  DashboardWidgetLayoutDto,
} from "../dtos/dashboard.dto";
import type {
  CreateDashboardLayoutInput,
  UpdateDashboardLayoutInput,
} from "../schemas/dashboard.schemas";

function toWidgetLayoutDto(widget: DashboardWidgetLayout): DashboardWidgetLayoutDto {
  return {
    widgetId: widget.widgetId,
    row: widget.row,
    column: widget.column,
    width: widget.width,
    height: widget.height,
    visible: widget.visible,
  };
}

function toLayoutContentDto(
  layout: DashboardLayoutContent,
): DashboardLayoutContentDto {
  return {
    version: layout.version,
    theme: layout.theme,
    collapsedSections: layout.collapsedSections,
    widgets: layout.widgets.map(toWidgetLayoutDto),
  };
}

export function toDashboardLayoutDto(layout: DashboardLayout): DashboardLayoutDto {
  const props = layout.toProps();

  return {
    id: props.id,
    userId: props.userId,
    dashboardId: props.dashboardId,
    dashboardCode: props.dashboardCode,
    isCustomized: props.isCustomized,
    layout: toLayoutContentDto(props.layout),
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateDashboardLayoutData(
  input: CreateDashboardLayoutInput,
): CreateDashboardLayoutData {
  return {
    layout: input.layout,
  };
}

export function toUpdateDashboardLayoutData(
  input: UpdateDashboardLayoutInput,
): UpdateDashboardLayoutData {
  return {
    layout: input.layout,
  };
}
