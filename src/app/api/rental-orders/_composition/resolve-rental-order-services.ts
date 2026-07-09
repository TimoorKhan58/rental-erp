import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { RentalOrderServiceResolver } from "@/modules/rental-order/application/services/rental-order-application-services.interface";
import { createRentalOrderApplicationServices } from "@/modules/rental-order/infrastructure";

export const resolveRentalOrderApplicationServices: RentalOrderServiceResolver =
  (ctx: ExecutionContext) =>
    createRentalOrderApplicationServices(
      createSharedDepsFromExecutionContext(ctx),
      ctx.request.userId,
    );
