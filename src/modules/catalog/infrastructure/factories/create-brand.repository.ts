import type { Prisma } from "@/generated/prisma/client";
import type { IBrandRepository } from "@/modules/catalog/domain/brand.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaBrandRepository } from "../repositories/prisma-brand.repository";

export function createBrandRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IBrandRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "PrismaBrandRepository",
  });

  return new PrismaBrandRepository(runner);
}

export function createBrandRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IBrandRepository {
  return createBrandRepository(context.deps, context.tx);
}

export function createBrandRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IBrandRepository {
  return createBrandRepository(deps, tx);
}
