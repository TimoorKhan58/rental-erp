import type { ISupplierTransactionRunner } from "@/modules/supplier/application/services/supplier-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createSupplierRepository } from "./create-supplier.repository";

export function createSupplierTransactionRunner(
  deps: SharedDeps,
): ISupplierTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createSupplierRepository(context.deps, context.tx),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
