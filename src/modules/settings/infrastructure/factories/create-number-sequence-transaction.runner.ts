import type { INumberSequenceTransactionRunner } from "@/modules/settings/application/services/number-sequence-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createNumberSequenceRepositoryFromUnitOfWork } from "./create-number-sequence.repository";

export function createNumberSequenceTransactionRunner(
  deps: SharedDeps,
): INumberSequenceTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          numberSequenceRepository:
            createNumberSequenceRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
