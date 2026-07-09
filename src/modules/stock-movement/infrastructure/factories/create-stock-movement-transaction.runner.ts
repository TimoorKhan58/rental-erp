import { createInventoryRepositoryFromUnitOfWork } from "@/modules/inventory/infrastructure/factories/create-inventory.repository";
import type { IStockMovementTransactionRunner } from "@/modules/stock-movement/application/services/stock-movement-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createStockMovementRepositoryFromUnitOfWork } from "./create-stock-movement.repository";

export interface CreateStockMovementTransactionRunnerOptions {
  userId?: string;
}

export function createStockMovementTransactionRunner(
  deps: SharedDeps,
  options: CreateStockMovementTransactionRunnerOptions = {},
): IStockMovementTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          stockMovementRepository: createStockMovementRepositoryFromUnitOfWork(
            context,
          ),
          inventoryRepository: createInventoryRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          userId: options.userId,
        }),
      ),
  };
}
