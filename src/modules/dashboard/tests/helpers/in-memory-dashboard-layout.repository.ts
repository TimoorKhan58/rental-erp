import { DashboardLayout } from "@/modules/dashboard/domain/dashboard-layout.entity";
import { buildDefaultDashboardLayoutContent } from "@/modules/dashboard/domain/dashboard.rules";
import type { IDashboardLayoutRepository } from "@/modules/dashboard/domain/dashboard.repository.interface";
import type {
  CreateDashboardLayoutData,
  DashboardLayoutContent,
  DefaultDashboardTemplate,
} from "@/modules/dashboard/domain/dashboard.types";
import type { DashboardId } from "@/shared/domain/ids";

export const DASHBOARD_USER_ID = "dd0e8400-e29b-41d4-a716-446655440000";

export const DEFAULT_DASHBOARD_TEMPLATE: DefaultDashboardTemplate = {
  id: "00000000-0000-4000-8000-000000000201" as DashboardId,
  code: "overview",
  widgets: [
    {
      widgetKey: "summary-kpis",
      row: 0,
      column: 0,
      width: 12,
      height: 2,
      visible: true,
    },
  ],
};

export function sampleDashboardLayoutContent(): DashboardLayoutContent {
  return {
    version: 1,
    theme: "light",
    collapsedSections: [],
    widgets: [
      {
        widgetId: "summary-kpis",
        row: 0,
        column: 0,
        width: 12,
        height: 2,
        visible: true,
      },
    ],
  };
}

export class InMemoryDashboardLayoutRepository
  implements IDashboardLayoutRepository
{
  private readonly layouts = new Map<string, DashboardLayout>();
  private defaultTemplate: DefaultDashboardTemplate | null =
    DEFAULT_DASHBOARD_TEMPLATE;

  setDefaultTemplate(template: DefaultDashboardTemplate | null): void {
    this.defaultTemplate = template;
  }

  seedLayout(userId: string, layout?: DashboardLayoutContent): DashboardLayout {
    const content = layout ?? sampleDashboardLayoutContent();
    const entity = DashboardLayout.reconstitute({
      id: crypto.randomUUID(),
      userId,
      dashboardId: DEFAULT_DASHBOARD_TEMPLATE.id,
      dashboardCode: DEFAULT_DASHBOARD_TEMPLATE.code,
      isCustomized: true,
      layout: content,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    this.layouts.set(userId, entity);
    return entity;
  }

  findByUserId(userId: string): Promise<DashboardLayout | null> {
    return Promise.resolve(this.layouts.get(userId) ?? null);
  }

  findDefaultDashboardTemplate(): Promise<DefaultDashboardTemplate | null> {
    return Promise.resolve(this.defaultTemplate);
  }

  async create(
    userId: string,
    data: CreateDashboardLayoutData,
  ): Promise<DashboardLayout> {
    const entity = DashboardLayout.reconstitute({
      id: crypto.randomUUID(),
      userId,
      dashboardId: DEFAULT_DASHBOARD_TEMPLATE.id,
      dashboardCode: DEFAULT_DASHBOARD_TEMPLATE.code,
      isCustomized: true,
      layout: data.layout,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.layouts.set(userId, entity);
    return entity;
  }

  async update(
    userId: string,
    layout: DashboardLayoutContent,
  ): Promise<DashboardLayout> {
    const existing = this.layouts.get(userId);

    if (existing === undefined) {
      throw new Error(`Dashboard layout not found for user: ${userId}`);
    }

    const updated = DashboardLayout.reconstitute({
      ...existing.toProps(),
      layout,
      isCustomized: true,
      updatedAt: new Date(),
    });
    this.layouts.set(userId, updated);
    return updated;
  }

  async reset(userId: string): Promise<DashboardLayout> {
    const existing = this.layouts.get(userId);

    if (existing === undefined) {
      throw new Error(`Dashboard layout not found for user: ${userId}`);
    }

    if (this.defaultTemplate === null) {
      throw new Error("Default dashboard template is not configured");
    }

    const resetLayout = buildDefaultDashboardLayoutContent(this.defaultTemplate);
    const reset = DashboardLayout.reconstitute({
      ...existing.toProps(),
      layout: resetLayout,
      isCustomized: false,
      updatedAt: new Date(),
    });
    this.layouts.set(userId, reset);
    return reset;
  }
}
