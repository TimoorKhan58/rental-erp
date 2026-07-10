import type { Prisma } from "@/generated/prisma/client";
import type { ISettingsRepository } from "@/modules/settings/domain/settings.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaSettingsRepository } from "../repositories/prisma-settings.repository";

export function createSettingsRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): ISettingsRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "SettingsRepository",
  });

  return new PrismaSettingsRepository(runner);
}

export function createSettingsRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): ISettingsRepository {
  return createSettingsRepository(context.deps, context.tx);
}

export function createSettingsRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): ISettingsRepository {
  return createSettingsRepository(deps, tx);
}
