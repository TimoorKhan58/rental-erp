import type { Prisma } from "@/generated/prisma/client";
import type { IAttributeRepository } from "@/modules/catalog/domain/attribute.repository.interface";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaAttributeRepository } from "../repositories/prisma-attribute.repository";

export function createAttributeRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IAttributeRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "PrismaAttributeRepository",
  });

  return new PrismaAttributeRepository(runner);
}

export function createAttributeRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IAttributeRepository {
  return createAttributeRepository(context.deps, context.tx);
}

export function createAttributeRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IAttributeRepository {
  return createAttributeRepository(deps, tx);
}
