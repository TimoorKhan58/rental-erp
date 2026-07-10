import type { Prisma } from "@/generated/prisma/client";
import type { IUnitRepository } from "@/modules/catalog/domain/unit.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaUnitRepository } from "../repositories/prisma-unit.repository";

export function createUnitRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IUnitRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "PrismaUnitRepository",
  });

  return new PrismaUnitRepository(runner);
}

export function createUnitRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IUnitRepository {
  return createUnitRepository(context.deps, context.tx);
}

export function createUnitRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IUnitRepository {
  return createUnitRepository(deps, tx);
}
