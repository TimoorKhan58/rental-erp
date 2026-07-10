import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { CategoryServiceResolver } from "@/modules/expense/application/services/category-application-services.interface";
import { createCategoryApplicationServices } from "@/modules/expense/infrastructure";

export const resolveExpenseCategoryApplicationServices: CategoryServiceResolver =
  (ctx: ExecutionContext) =>
    createCategoryApplicationServices(
      createSharedDepsFromExecutionContext(ctx),
    );
