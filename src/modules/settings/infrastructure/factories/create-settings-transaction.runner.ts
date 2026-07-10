import type { ISettingsTransactionRunner } from "@/modules/settings/application/services/settings-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createSettingsRepositoryFromUnitOfWork } from "./create-settings.repository";
import { createSystemSettingsRepositoryFromUnitOfWork } from "./create-system-settings.repository";

export function createSettingsTransactionRunner(
  deps: SharedDeps,
): ISettingsTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          settingsRepository: createSettingsRepositoryFromUnitOfWork(context),
          systemSettingsRepository:
            createSystemSettingsRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
