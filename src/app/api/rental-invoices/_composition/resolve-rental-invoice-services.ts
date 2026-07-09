import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { RentalInvoiceServiceResolver } from "@/modules/rental-invoice/application/services/rental-invoice-application-services.interface";
import { createRentalInvoiceApplicationServices } from "@/modules/rental-invoice/infrastructure";

export const resolveRentalInvoiceApplicationServices: RentalInvoiceServiceResolver =
  (ctx: ExecutionContext) =>
    createRentalInvoiceApplicationServices(
      createSharedDepsFromExecutionContext(ctx),
      ctx.request.userId,
    );
