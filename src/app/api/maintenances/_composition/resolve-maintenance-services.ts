import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { MaintenanceServiceResolver } from "@/modules/maintenance/application/services/maintenance-application-services.interface";
import { createMaintenanceApplicationServices } from "@/modules/maintenance/infrastructure";

export const resolveMaintenanceApplicationServices: MaintenanceServiceResolver =
  (ctx: ExecutionContext) =>
    createMaintenanceApplicationServices(
      createSharedDepsFromExecutionContext(ctx),
      ctx.request.userId,
    );
