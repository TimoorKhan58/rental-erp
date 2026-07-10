import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { CategoryServiceResolver } from "@/modules/asset/application/services/category-application-services.interface";
import { createCategoryApplicationServices } from "@/modules/asset/infrastructure";

export const resolveCategoryApplicationServices: CategoryServiceResolver = (
  ctx: ExecutionContext,
) =>
  createCategoryApplicationServices(
    createSharedDepsFromExecutionContext(ctx),
  );
