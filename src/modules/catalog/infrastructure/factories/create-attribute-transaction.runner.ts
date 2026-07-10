import type { IAttributeTransactionRunner } from "@/modules/catalog/application/services/attribute-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createAttributeRepository } from "./create-attribute.repository";

export function createAttributeTransactionRunner(
  deps: SharedDeps,
): IAttributeTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createAttributeRepository(context.deps, context.tx),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
