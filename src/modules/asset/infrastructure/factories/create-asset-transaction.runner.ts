import type { IAssetTransactionRunner } from "@/modules/asset/application/services/asset-transaction.runner";
import { createWarehouseRepositoryFromUnitOfWork } from "@/modules/warehouse/infrastructure/factories/create-warehouse.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createAssetCategoryRepositoryFromUnitOfWork } from "./create-asset-category.repository";
import { createAssetRepositoryFromUnitOfWork } from "./create-asset.repository";

export interface CreateAssetTransactionRunnerOptions {
  userId?: string;
}

export function createAssetTransactionRunner(
  deps: SharedDeps,
  options: CreateAssetTransactionRunnerOptions = {},
): IAssetTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          assetRepository: createAssetRepositoryFromUnitOfWork(context),
          categoryRepository: createAssetCategoryRepositoryFromUnitOfWork(context),
          warehouseRepository: createWarehouseRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          userId: options.userId,
        }),
      ),
  };
}
