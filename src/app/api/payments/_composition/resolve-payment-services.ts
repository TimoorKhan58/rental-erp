import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { PaymentServiceResolver } from "@/modules/payment/application/services/payment-application-services.interface";
import { createPaymentApplicationServices } from "@/modules/payment/infrastructure";

export const resolvePaymentApplicationServices: PaymentServiceResolver = (
  ctx: ExecutionContext,
) =>
  createPaymentApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
    ctx.request.userId,
  );
