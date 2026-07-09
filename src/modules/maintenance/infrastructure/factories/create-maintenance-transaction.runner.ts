import type { IMaintenanceTransactionRunner } from "@/modules/maintenance/application/services/maintenance-transaction.runner";
import { createInventoryRepositoryFromUnitOfWork } from "@/modules/inventory/infrastructure/factories/create-inventory.repository";
import { createStockMovementRepositoryFromUnitOfWork } from "@/modules/stock-movement/infrastructure/factories/create-stock-movement.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createMaintenanceRepositoryFromUnitOfWork } from "./create-maintenance.repository";

export interface CreateMaintenanceTransactionRunnerOptions {
  userId?: string;
}

export function createMaintenanceTransactionRunner(
  deps: SharedDeps,
  options: CreateMaintenanceTransactionRunnerOptions = {},
): IMaintenanceTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          maintenanceRepository: createMaintenanceRepositoryFromUnitOfWork(context),
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
