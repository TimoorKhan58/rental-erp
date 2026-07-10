import { createBrandRepositoryFromUnitOfWork } from "@/modules/catalog/infrastructure/factories/create-brand.repository";
import { createCategoryRepositoryFromUnitOfWork } from "@/modules/catalog/infrastructure/factories/create-category.repository";
import { createUnitRepositoryFromUnitOfWork } from "@/modules/catalog/infrastructure/factories/create-unit.repository";
import type { IProductTransactionRunner } from "@/modules/product/application/services/product-transaction.runner";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createProductRepository } from "./create-product.repository";

export function createProductTransactionRunner(
  deps: SharedDeps,
): IProductTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          repository: createProductRepository(context.deps, context.tx),
          categoryRepository: createCategoryRepositoryFromUnitOfWork(context),
          brandRepository: createBrandRepositoryFromUnitOfWork(context),
          unitRepository: createUnitRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
        }),
      ),
  };
}
