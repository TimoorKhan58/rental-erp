import type { IInventoryTransactionRunner } from "@/modules/inventory/application/services/inventory-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createInventoryRepository } from "./create-inventory.repository";

export function createInventoryTransactionRunner(
  deps: SharedDeps,
): IInventoryTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createInventoryRepository(context.deps, context.tx),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
