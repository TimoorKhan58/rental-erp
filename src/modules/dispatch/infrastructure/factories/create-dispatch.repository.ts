import type { Prisma } from "@/generated/prisma/client";
import type { IDispatchRepository } from "@/modules/dispatch/domain/dispatch.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaDispatchRepository } from "../repositories/prisma-dispatch.repository";

export function createDispatchRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IDispatchRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "DispatchRepository",
  });

  return new PrismaDispatchRepository(runner);
}

export function createDispatchRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IDispatchRepository {
  return createDispatchRepository(context.deps, context.tx);
}

export function createDispatchRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IDispatchRepository {
  return createDispatchRepository(deps, tx);
}
