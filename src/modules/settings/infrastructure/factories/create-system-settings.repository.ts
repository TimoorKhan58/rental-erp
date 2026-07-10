import type { Prisma } from "@/generated/prisma/client";
import type { ISystemSettingsRepository } from "@/modules/settings/domain/system-settings.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaSystemSettingsRepository } from "../repositories/prisma-system-settings.repository";

export function createSystemSettingsRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): ISystemSettingsRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "SystemSettingsRepository",
  });

  return new PrismaSystemSettingsRepository(runner);
}

export function createSystemSettingsRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): ISystemSettingsRepository {
  return createSystemSettingsRepository(context.deps, context.tx);
}

export function createSystemSettingsRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): ISystemSettingsRepository {
  return createSystemSettingsRepository(deps, tx);
}
