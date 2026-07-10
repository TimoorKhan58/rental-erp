import type { ITagTransactionRunner } from "@/modules/catalog/application/services/tag-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createTagRepository } from "./create-tag.repository";

export function createTagTransactionRunner(
  deps: SharedDeps,
): ITagTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createTagRepository(context.deps, context.tx),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
