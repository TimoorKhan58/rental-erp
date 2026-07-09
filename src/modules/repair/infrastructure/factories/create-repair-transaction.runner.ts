import type { IRepairTransactionRunner } from "@/modules/repair/application/services/repair-transaction.runner";
import { createInventoryRepositoryFromUnitOfWork } from "@/modules/inventory/infrastructure/factories/create-inventory.repository";
import { createRentalOrderRepositoryFromUnitOfWork } from "@/modules/rental-order/infrastructure/factories/create-rental-order.repository";
import { createReturnRepositoryFromUnitOfWork } from "@/modules/return/infrastructure/factories/create-return.repository";
import { createStockMovementRepositoryFromUnitOfWork } from "@/modules/stock-movement/infrastructure/factories/create-stock-movement.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createRepairRepositoryFromUnitOfWork } from "./create-repair.repository";

export interface CreateRepairTransactionRunnerOptions {
  userId?: string;
}

export function createRepairTransactionRunner(
  deps: SharedDeps,
  options: CreateRepairTransactionRunnerOptions = {},
): IRepairTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repairRepository: createRepairRepositoryFromUnitOfWork(context),
          returnRepository: createReturnRepositoryFromUnitOfWork(context),
          rentalOrderRepository: createRentalOrderRepositoryFromUnitOfWork(context),
          inventoryRepository: createInventoryRepositoryFromUnitOfWork(context),
          stockMovementRepository: createStockMovementRepositoryFromUnitOfWork(
            context,
          ),
          auditLogger: context.deps.auditLogger,
          userId: options.userId,
        }),
      ),
  };
}
