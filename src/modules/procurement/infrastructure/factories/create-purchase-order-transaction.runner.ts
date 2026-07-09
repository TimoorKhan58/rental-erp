import type { IPurchaseOrderTransactionRunner } from "@/modules/procurement/application/services/purchase-order-transaction.runner";
import { createInventoryRepositoryFromUnitOfWork } from "@/modules/inventory/infrastructure/factories/create-inventory.repository";
import { createStockMovementRepositoryFromUnitOfWork } from "@/modules/stock-movement/infrastructure/factories/create-stock-movement.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createPurchaseOrderRepositoryFromUnitOfWork } from "./create-purchase-order.repository";

export interface CreatePurchaseOrderTransactionRunnerOptions {
  userId?: string;
}

export function createPurchaseOrderTransactionRunner(
  deps: SharedDeps,
  options: CreatePurchaseOrderTransactionRunnerOptions = {},
): IPurchaseOrderTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          purchaseOrderRepository: createPurchaseOrderRepositoryFromUnitOfWork(
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
