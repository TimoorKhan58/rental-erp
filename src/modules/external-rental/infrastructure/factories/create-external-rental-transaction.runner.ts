import type { IExternalRentalTransactionRunner } from "@/modules/external-rental/application/services/external-rental-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createExternalRentalRepositoryFromUnitOfWork } from "./create-external-rental.repository";

export interface CreateExternalRentalTransactionRunnerOptions {
  userId?: string;
}

export function createExternalRentalTransactionRunner(
  deps: SharedDeps,
  options: CreateExternalRentalTransactionRunnerOptions = {},
): IExternalRentalTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          externalRentalRepository:
            createExternalRentalRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          userId: options.userId,
        }),
      ),
  };
}
