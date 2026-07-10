import type { ICategoryTransactionRunner } from "@/modules/catalog/application/services/category-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createCategoryRepository } from "./create-category.repository";

export function createCategoryTransactionRunner(
  deps: SharedDeps,
): ICategoryTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createCategoryRepository(context.deps, context.tx),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
