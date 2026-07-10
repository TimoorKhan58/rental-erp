import type { DashboardApplicationServices } from "@/modules/dashboard/application/services/dashboard-application-services.interface";
import { CreateDashboardLayoutService } from "@/modules/dashboard/application/services/create-dashboard-layout.service";
import { DashboardService } from "@/modules/dashboard/application/services/dashboard.service";
import { GetDashboardLayoutService } from "@/modules/dashboard/application/services/get-dashboard-layout.service";
import { ResetDashboardLayoutService } from "@/modules/dashboard/application/services/reset-dashboard-layout.service";
import { UpdateDashboardLayoutService } from "@/modules/dashboard/application/services/update-dashboard-layout.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createDashboardLayoutRepositoryFromSharedDeps } from "./create-dashboard.repository";
import { createDashboardTransactionRunner } from "./create-dashboard-transaction.runner";

export type WiredDashboardApplicationServices = DashboardApplicationServices;

export function createDashboardApplicationServices(
  deps: SharedDeps,
): WiredDashboardApplicationServices {
  const repository = createDashboardLayoutRepositoryFromSharedDeps(deps);
  const transactionRunner = createDashboardTransactionRunner(deps);

  const getDashboardLayout = new GetDashboardLayoutService(repository);
  const createDashboardLayout = new CreateDashboardLayoutService(transactionRunner);
  const updateDashboardLayout = new UpdateDashboardLayoutService(transactionRunner);
  const resetDashboardLayout = new ResetDashboardLayoutService(transactionRunner);

  return {
    getDashboardLayout,
    createDashboardLayout,
    updateDashboardLayout,
    resetDashboardLayout,
    dashboardService: new DashboardService(
      getDashboardLayout,
      createDashboardLayout,
      updateDashboardLayout,
      resetDashboardLayout,
    ),
  };
}
