import type { IWarehouseTransactionRunner } from "@/modules/warehouse/application/services/warehouse-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createWarehouseRepository } from "./create-warehouse.repository";

export function createWarehouseTransactionRunner(
  deps: SharedDeps,
): IWarehouseTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createWarehouseRepository(context.deps, context.tx),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
