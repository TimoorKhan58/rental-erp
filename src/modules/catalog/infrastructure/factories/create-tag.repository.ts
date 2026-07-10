import type { Prisma } from "@/generated/prisma/client";
import type { ITagRepository } from "@/modules/catalog/domain/tag.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaTagRepository } from "../repositories/prisma-tag.repository";

export function createTagRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): ITagRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "PrismaTagRepository",
  });

  return new PrismaTagRepository(runner);
}

export function createTagRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): ITagRepository {
  return createTagRepository(context.deps, context.tx);
}

export function createTagRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): ITagRepository {
  return createTagRepository(deps, tx);
}
