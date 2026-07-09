import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { InventoryServiceResolver } from "@/modules/inventory/application/services/inventory-application-services.interface";
import { createInventoryApplicationServices } from "@/modules/inventory/infrastructure";

export const resolveInventoryApplicationServices: InventoryServiceResolver = (
  ctx: ExecutionContext,
) => createInventoryApplicationServices(createSharedDepsFromExecutionContext(ctx));
