import type { ICustomerTransactionRunner } from "@/modules/customer/application/services/customer-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createCustomerRepository } from "./create-customer.repository";

export function createCustomerTransactionRunner(
  deps: SharedDeps,
): ICustomerTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createCustomerRepository(context.deps, context.tx),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
