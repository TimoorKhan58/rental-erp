import type { Prisma } from "@/generated/prisma/client";
import { DashboardLayout } from "@/modules/dashboard/domain/dashboard-layout.entity";
import {
  buildDefaultDashboardLayoutContent,
  normalizeCreateDashboardLayoutData,
  normalizeDashboardLayoutContent,
} from "@/modules/dashboard/domain/dashboard.rules";
import type {
  CreateDashboardLayoutData,
  DashboardLayoutContent,
  DefaultDashboardTemplate,
} from "@/modules/dashboard/domain/dashboard.types";
import type { DashboardId } from "@/shared/domain/ids";

function isDashboardLayoutContent(value: unknown): value is DashboardLayoutContent {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.version === "number" &&
    typeof record.theme === "string" &&
    Array.isArray(record.collapsedSections) &&
    Array.isArray(record.widgets)
  );
}

function parseCustomLayout(value: Prisma.JsonValue | null): DashboardLayoutContent | null {
  if (value === null) {
    return null;
  }

  if (!isDashboardLayoutContent(value)) {
    return null;
  }

  return normalizeDashboardLayoutContent(value);
}

export function toDefaultDashboardTemplate(record: {
  id: string;
  code: string;
  widgets: Array<{
    widgetKey: string;
    row: number;
    column: number;
    width: number;
    height: number;
    visible: boolean;
  }>;
}): DefaultDashboardTemplate {
  return {
    id: record.id as DashboardId,
    code: record.code,
    widgets: record.widgets.map((widget) => ({
      widgetKey: widget.widgetKey,
      row: widget.row,
      column: widget.column,
      width: widget.width,
      height: widget.height,
      visible: widget.visible,
    })),
  };
}

export function toDashboardLayoutDomain(
  record: {
    id: string;
    userId: string;
    dashboardId: string;
    customLayout: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  },
  dashboard: {
    code: string;
  },
  defaultTemplate: DefaultDashboardTemplate,
): DashboardLayout {
  const customLayout = parseCustomLayout(record.customLayout);
  const layout =
    customLayout ??
    buildDefaultDashboardLayoutContent(defaultTemplate);

  return DashboardLayout.reconstitute({
    id: record.id,
    userId: record.userId,
    dashboardId: record.dashboardId as DashboardId,
    dashboardCode: dashboard.code,
    isCustomized: customLayout !== null,
    layout,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toCustomLayoutJson(
  layout: DashboardLayoutContent,
): Prisma.InputJsonValue {
  return layout as unknown as Prisma.InputJsonValue;
}

export function toCreateDashboardLayoutPersistence(
  data: CreateDashboardLayoutData,
): DashboardLayoutContent {
  return normalizeCreateDashboardLayoutData(data).layout;
}

export function toUpdateDashboardLayoutPersistence(
  layout: DashboardLayoutContent,
): DashboardLayoutContent {
  return normalizeDashboardLayoutContent(layout);
}
