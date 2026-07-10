import type { ICategoryTransactionRunner } from "@/modules/asset/application/services/category-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createAssetCategoryRepository } from "./create-asset-category.repository";

export function createCategoryTransactionRunner(
  deps: SharedDeps,
): ICategoryTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createAssetCategoryRepository(context.deps, context.tx),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
