import type { Prisma } from "@/generated/prisma/client";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaNumberSequenceRepository } from "../repositories/prisma-number-sequence.repository";

export function createNumberSequenceRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): INumberSequenceRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "NumberSequenceRepository",
  });

  return new PrismaNumberSequenceRepository(runner);
}

export function createNumberSequenceRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): INumberSequenceRepository {
  return createNumberSequenceRepository(context.deps, context.tx);
}

export function createNumberSequenceRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): INumberSequenceRepository {
  return createNumberSequenceRepository(deps, tx);
}
