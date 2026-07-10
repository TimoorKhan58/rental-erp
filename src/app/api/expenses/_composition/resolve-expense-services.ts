import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { ExpenseServiceResolver } from "@/modules/expense/application/services/expense-application-services.interface";
import { createExpenseApplicationServices } from "@/modules/expense/infrastructure";

export const resolveExpenseApplicationServices: ExpenseServiceResolver = (
  ctx: ExecutionContext,
) =>
  createExpenseApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
    ctx.request.userId,
  );
