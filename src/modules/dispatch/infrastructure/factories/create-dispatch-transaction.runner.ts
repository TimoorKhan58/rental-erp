import type { IDispatchTransactionRunner } from "@/modules/dispatch/application/services/dispatch-transaction.runner";
import { createInventoryRepositoryFromUnitOfWork } from "@/modules/inventory/infrastructure/factories/create-inventory.repository";
import { createRentalOrderRepositoryFromUnitOfWork } from "@/modules/rental-order/infrastructure/factories/create-rental-order.repository";
import { createStockMovementRepositoryFromUnitOfWork } from "@/modules/stock-movement/infrastructure/factories/create-stock-movement.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createDispatchRepositoryFromUnitOfWork } from "./create-dispatch.repository";

export interface CreateDispatchTransactionRunnerOptions {
  userId?: string;
}

export function createDispatchTransactionRunner(
  deps: SharedDeps,
  options: CreateDispatchTransactionRunnerOptions = {},
): IDispatchTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          dispatchRepository: createDispatchRepositoryFromUnitOfWork(context),
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
