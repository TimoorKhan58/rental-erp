import type { IBrandTransactionRunner } from "@/modules/catalog/application/services/brand-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createBrandRepository } from "./create-brand.repository";

export function createBrandTransactionRunner(
  deps: SharedDeps,
): IBrandTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createBrandRepository(context.deps, context.tx),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
