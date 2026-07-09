import type { IRentalOrderTransactionRunner } from "@/modules/rental-order/application/services/rental-order-transaction.runner";
import { createInventoryRepositoryFromUnitOfWork } from "@/modules/inventory/infrastructure/factories/create-inventory.repository";
import { createStockMovementRepositoryFromUnitOfWork } from "@/modules/stock-movement/infrastructure/factories/create-stock-movement.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createRentalOrderRepositoryFromUnitOfWork } from "./create-rental-order.repository";

export interface CreateRentalOrderTransactionRunnerOptions {
  userId?: string;
}

export function createRentalOrderTransactionRunner(
  deps: SharedDeps,
  options: CreateRentalOrderTransactionRunnerOptions = {},
): IRentalOrderTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          rentalOrderRepository: createRentalOrderRepositoryFromUnitOfWork(
            context,
          ),
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
