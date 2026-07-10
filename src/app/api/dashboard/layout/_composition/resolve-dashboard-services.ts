import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { DashboardServiceResolver } from "@/modules/dashboard/application/services/dashboard-application-services.interface";
import { createDashboardApplicationServices } from "@/modules/dashboard/infrastructure";

export const resolveDashboardApplicationServices: DashboardServiceResolver = (
  ctx: ExecutionContext,
) => createDashboardApplicationServices(createSharedDepsFromExecutionContext(ctx));
