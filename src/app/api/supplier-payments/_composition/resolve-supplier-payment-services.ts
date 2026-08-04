import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { SupplierPaymentServiceResolver } from "@/modules/supplier-payment/application/services/supplier-payment-application-services.interface";
import { createSupplierPaymentApplicationServices } from "@/modules/supplier-payment/infrastructure";

export const resolveSupplierPaymentApplicationServices: SupplierPaymentServiceResolver =
  (ctx: ExecutionContext) =>
    createSupplierPaymentApplicationServices(
      createSharedDepsFromExecutionContext(ctx),
      ctx.request.userId,
    );
