import type { DashboardId } from "@/shared/domain/ids";

import type { DashboardTheme } from "./dashboard.constants";

export interface DashboardWidgetLayout {
  readonly widgetId: string;
  readonly row: number;
  readonly column: number;
  readonly width: number;
  readonly height: number;
  readonly visible: boolean;
}

export interface DashboardLayoutContent {
  readonly version: number;
  readonly theme: DashboardTheme;
  readonly collapsedSections: string[];
  readonly widgets: DashboardWidgetLayout[];
}

export interface DashboardLayoutProps {
  readonly id: string;
  readonly userId: string;
  readonly dashboardId: DashboardId;
  readonly dashboardCode: string;
  readonly isCustomized: boolean;
  readonly layout: DashboardLayoutContent;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateDashboardLayoutData {
  readonly layout: DashboardLayoutContent;
}

export interface UpdateDashboardLayoutData {
  readonly layout: Partial<DashboardLayoutContent> & {
    widgets?: DashboardWidgetLayout[];
  };
}

export interface DefaultDashboardWidgetTemplate {
  readonly widgetKey: string;
  readonly row: number;
  readonly column: number;
  readonly width: number;
  readonly height: number;
  readonly visible: boolean;
}

export interface DefaultDashboardTemplate {
  readonly id: DashboardId;
  readonly code: string;
  readonly widgets: DefaultDashboardWidgetTemplate[];
}
