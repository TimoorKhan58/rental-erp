import type { IDashboardLayoutRepository } from "@/modules/dashboard/domain/dashboard.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaDashboardLayoutRepository } from "../repositories/prisma-dashboard-layout.repository";

export function createDashboardLayoutRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
): IDashboardLayoutRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    repositoryName: "DashboardLayoutRepository",
  });

  return new PrismaDashboardLayoutRepository(runner);
}

export function createDashboardLayoutRepositoryFromSharedDeps(
  deps: SharedDeps,
): IDashboardLayoutRepository {
  return createDashboardLayoutRepository(deps);
}
