import type { IUnitTransactionRunner } from "@/modules/catalog/application/services/unit-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createUnitRepository } from "./create-unit.repository";

export function createUnitTransactionRunner(
  deps: SharedDeps,
): IUnitTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createUnitRepository(context.deps, context.tx),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
