import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { StockMovementServiceResolver } from "@/modules/stock-movement/application/services/stock-movement-application-services.interface";
import { createStockMovementApplicationServices } from "@/modules/stock-movement/infrastructure";

export const resolveStockMovementServices: StockMovementServiceResolver = (
  ctx: ExecutionContext,
) =>
  createStockMovementApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
    ctx.request.userId,
  );
