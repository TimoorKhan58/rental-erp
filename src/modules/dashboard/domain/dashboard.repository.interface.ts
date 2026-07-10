import type {
  CreateDashboardLayoutData,
  DashboardLayoutContent,
  DefaultDashboardTemplate,
} from "./dashboard.types";
import type { DashboardLayout } from "./dashboard-layout.entity";

export interface IDashboardLayoutRepository {
  findByUserId(userId: string): Promise<DashboardLayout | null>;
  findDefaultDashboardTemplate(): Promise<DefaultDashboardTemplate | null>;
  create(
    userId: string,
    data: CreateDashboardLayoutData,
  ): Promise<DashboardLayout>;
  update(
    userId: string,
    layout: DashboardLayoutContent,
  ): Promise<DashboardLayout>;
  reset(userId: string): Promise<DashboardLayout>;
}
