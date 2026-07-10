import {
  DASHBOARD_THEMES,
  DASHBOARD_WIDGET_IDS,
  DEFAULT_LAYOUT_VERSION,
  MAX_WIDGET_HEIGHT,
  MAX_WIDGET_WIDTH,
  MIN_WIDGET_COORDINATE,
  MIN_WIDGET_DIMENSION,
  type DashboardTheme,
} from "./dashboard.constants";
import { DashboardInvariantError } from "./dashboard.errors";
import type {
  CreateDashboardLayoutData,
  DashboardLayoutContent,
  DashboardWidgetLayout,
  DefaultDashboardTemplate,
  UpdateDashboardLayoutData,
} from "./dashboard.types";

function isDashboardTheme(value: string): value is DashboardTheme {
  return (DASHBOARD_THEMES as readonly string[]).includes(value);
}

function isValidWidgetId(widgetId: string): boolean {
  return (DASHBOARD_WIDGET_IDS as readonly string[]).includes(widgetId);
}

function normalizeCollapsedSections(sections: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const section of sections) {
    const trimmed = section.trim();

    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function validateWidgetCoordinate(
  value: number,
  field: string,
): number {
  if (!Number.isInteger(value) || value < MIN_WIDGET_COORDINATE) {
    throw new DashboardInvariantError(
      `${field} must be a non-negative integer`,
      field,
    );
  }

  return value;
}

function validateWidgetDimension(
  value: number,
  field: string,
  max: number,
): number {
  if (!Number.isInteger(value) || value < MIN_WIDGET_DIMENSION || value > max) {
    throw new DashboardInvariantError(
      `${field} must be an integer between ${MIN_WIDGET_DIMENSION} and ${max}`,
      field,
    );
  }

  return value;
}

export function normalizeDashboardWidgetLayout(
  widget: DashboardWidgetLayout,
): DashboardWidgetLayout {
  const widgetId = widget.widgetId.trim();

  if (!isValidWidgetId(widgetId)) {
    throw new DashboardInvariantError(
      `Invalid widget id: ${widget.widgetId}`,
      "widgets.widgetId",
    );
  }

  return {
    widgetId,
    row: validateWidgetCoordinate(widget.row, "widgets.row"),
    column: validateWidgetCoordinate(widget.column, "widgets.column"),
    width: validateWidgetDimension(widget.width, "widgets.width", MAX_WIDGET_WIDTH),
    height: validateWidgetDimension(
      widget.height,
      "widgets.height",
      MAX_WIDGET_HEIGHT,
    ),
    visible: widget.visible,
  };
}

export function normalizeDashboardLayoutContent(
  content: DashboardLayoutContent,
): DashboardLayoutContent {
  if (!Number.isInteger(content.version) || content.version < 1) {
    throw new DashboardInvariantError(
      "version must be a positive integer",
      "version",
    );
  }

  if (!isDashboardTheme(content.theme)) {
    throw new DashboardInvariantError(
      `theme must be one of: ${DASHBOARD_THEMES.join(", ")}`,
      "theme",
    );
  }

  if (!Array.isArray(content.widgets) || content.widgets.length === 0) {
    throw new DashboardInvariantError(
      "At least one widget is required",
      "widgets",
    );
  }

  const widgetIds = new Set<string>();
  const widgets = content.widgets.map((widget) => {
    const normalized = normalizeDashboardWidgetLayout(widget);

    if (widgetIds.has(normalized.widgetId)) {
      throw new DashboardInvariantError(
        `Duplicate widget id: ${normalized.widgetId}`,
        "widgets.widgetId",
      );
    }

    widgetIds.add(normalized.widgetId);
    return normalized;
  });

  return {
    version: content.version,
    theme: content.theme,
    collapsedSections: normalizeCollapsedSections(content.collapsedSections),
    widgets,
  };
}

export function normalizeCreateDashboardLayoutData(
  data: CreateDashboardLayoutData,
): CreateDashboardLayoutData {
  return {
    layout: normalizeDashboardLayoutContent(data.layout),
  };
}

export function mergeDashboardLayoutContent(
  current: DashboardLayoutContent,
  update: UpdateDashboardLayoutData,
): DashboardLayoutContent {
  return normalizeDashboardLayoutContent({
    version: update.layout.version ?? current.version,
    theme: update.layout.theme ?? current.theme,
    collapsedSections:
      update.layout.collapsedSections ?? current.collapsedSections,
    widgets: update.layout.widgets ?? current.widgets,
  });
}

export function buildDefaultDashboardLayoutContent(
  template: DefaultDashboardTemplate,
): DashboardLayoutContent {
  return normalizeDashboardLayoutContent({
    version: DEFAULT_LAYOUT_VERSION,
    theme: "light",
    collapsedSections: [],
    widgets: template.widgets.map((widget) => ({
      widgetId: widget.widgetKey,
      row: widget.row,
      column: widget.column,
      width: widget.width,
      height: widget.height,
      visible: widget.visible,
    })),
  });
}
