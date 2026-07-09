import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { WarehouseServiceResolver } from "@/modules/warehouse/application/services/warehouse-application-services.interface";
import { createWarehouseApplicationServices } from "@/modules/warehouse/infrastructure";

export const resolveWarehouseApplicationServices: WarehouseServiceResolver = (
  ctx: ExecutionContext,
) => createWarehouseApplicationServices(createSharedDepsFromExecutionContext(ctx));
