import type { ExecutionContext } from "@/shared/application/context";

import type { DashboardLayoutDto } from "../dtos/dashboard.dto";
import type {
  CreateDashboardLayoutInput,
  UpdateDashboardLayoutInput,
} from "../schemas/dashboard.schemas";
import type { CreateDashboardLayoutService } from "./create-dashboard-layout.service";
import type { GetDashboardLayoutService } from "./get-dashboard-layout.service";
import type { ResetDashboardLayoutService } from "./reset-dashboard-layout.service";
import type { UpdateDashboardLayoutService } from "./update-dashboard-layout.service";

export interface DashboardApplicationServices {
  getDashboardLayout: GetDashboardLayoutService;
  createDashboardLayout: CreateDashboardLayoutService;
  updateDashboardLayout: UpdateDashboardLayoutService;
  resetDashboardLayout: ResetDashboardLayoutService;
  dashboardService: IDashboardService;
}

export type DashboardServiceResolver = (
  ctx: ExecutionContext,
) => DashboardApplicationServices;

export interface IDashboardService {
  getLayout(ctx: ExecutionContext): Promise<DashboardLayoutDto>;
  createLayout(
    input: CreateDashboardLayoutInput,
    ctx: ExecutionContext,
  ): Promise<DashboardLayoutDto>;
  updateLayout(
    input: UpdateDashboardLayoutInput,
    ctx: ExecutionContext,
  ): Promise<DashboardLayoutDto>;
  resetLayout(ctx: ExecutionContext): Promise<DashboardLayoutDto>;
}
