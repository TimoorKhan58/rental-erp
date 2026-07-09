import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { PurchaseOrderServiceResolver } from "@/modules/procurement/application/services/purchase-order-application-services.interface";
import { createPurchaseOrderApplicationServices } from "@/modules/procurement/infrastructure";

export const resolvePurchaseOrderApplicationServices: PurchaseOrderServiceResolver =
  (ctx: ExecutionContext) =>
    createPurchaseOrderApplicationServices(
      createSharedDepsFromExecutionContext(ctx),
      ctx.request.userId,
    );
