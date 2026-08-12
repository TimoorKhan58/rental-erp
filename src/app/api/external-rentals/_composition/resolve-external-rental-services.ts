import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { ExternalRentalServiceResolver } from "@/modules/external-rental/application/services/external-rental-application-services.interface";
import { createExternalRentalApplicationServices } from "@/modules/external-rental/infrastructure";

export const resolveExternalRentalApplicationServices: ExternalRentalServiceResolver =
  (ctx: ExecutionContext) =>
    createExternalRentalApplicationServices(
      createSharedDepsFromExecutionContext(ctx),
      ctx.request.userId,
    );
