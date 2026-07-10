import type { Prisma } from "@/generated/prisma/client";
import type { IAssetRepository } from "@/modules/asset/domain";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import type { RepositoryUnitOfWorkContext } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

import { PrismaAssetRepository } from "../repositories/prisma-asset.repository";

export function createAssetRepository(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  tx?: Prisma.TransactionClient,
): IAssetRepository {
  const runner = createObservableRepositoryRunnerFromSharedDeps(deps, {
    tx,
    repositoryName: "AssetRepository",
  });

  return new PrismaAssetRepository(runner);
}

export function createAssetRepositoryFromUnitOfWork(
  context: RepositoryUnitOfWorkContext,
): IAssetRepository {
  return createAssetRepository(context.deps, context.tx);
}

export function createAssetRepositoryFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IAssetRepository {
  return createAssetRepository(deps, tx);
}
