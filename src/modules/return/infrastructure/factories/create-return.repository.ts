import type { Prisma } from "@/generated/prisma/client";
import type { IReturnRepository } from "@/modules/return/domain";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaReturnRepository } from "../repositories/prisma-return.repository";

export function createReturnRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IReturnRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "ReturnRepository",
  });

  return new PrismaReturnRepository(runner);
}

export function createReturnRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IReturnRepository {
  return createReturnRepository(context.deps, context.tx);
}

export function createReturnRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IReturnRepository {
  return createReturnRepository(deps, tx);
}
