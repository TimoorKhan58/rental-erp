import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { AccountingServiceResolver } from "@/modules/accounting/application/services/accounting-application-services.interface";
import { createAccountingApplicationServices } from "@/modules/accounting/infrastructure";

export const resolveAccountingApplicationServices: AccountingServiceResolver = (
  ctx: ExecutionContext,
) =>
  createAccountingApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
    ctx.request.userId,
  );
