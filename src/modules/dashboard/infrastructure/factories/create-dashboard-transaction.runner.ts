import type { IDashboardTransactionRunner } from "@/modules/dashboard/application/services/dashboard-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createDashboardLayoutRepository } from "./create-dashboard.repository";

export function createDashboardTransactionRunner(
  deps: SharedDeps,
): IDashboardTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createDashboardLayoutRepository(context.deps),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
