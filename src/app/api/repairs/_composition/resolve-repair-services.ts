import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { RepairServiceResolver } from "@/modules/repair/application/services/repair-application-services.interface";
import { createRepairApplicationServices } from "@/modules/repair/infrastructure";

export const resolveRepairApplicationServices: RepairServiceResolver = (
  ctx: ExecutionContext,
) =>
  createRepairApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
    ctx.request.userId,
  );
