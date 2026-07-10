import type { Prisma } from "@/generated/prisma/client";
import type { IAssetCategoryRepository } from "@/modules/asset/domain";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaAssetCategoryRepository } from "../repositories/prisma-asset-category.repository";

export function createAssetCategoryRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IAssetCategoryRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "AssetCategoryRepository",
  });

  return new PrismaAssetCategoryRepository(runner);
}

export function createAssetCategoryRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IAssetCategoryRepository {
  return createAssetCategoryRepository(context.deps, context.tx);
}

export function createAssetCategoryRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IAssetCategoryRepository {
  return createAssetCategoryRepository(deps, tx);
}
