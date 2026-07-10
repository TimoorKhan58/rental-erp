import type { IBrandRepository } from "@/modules/catalog/domain/brand.repository.interface";
import type { ICategoryRepository } from "@/modules/catalog/domain/category.repository.interface";
import type { IUnitRepository } from "@/modules/catalog/domain/unit.repository.interface";
import type { ProductWriteScope } from "@/modules/product/application/services/product-transaction.runner";
import type { IProductTransactionRunner } from "@/modules/product/application/services/product-transaction.runner";

import type { InMemoryProductRepository } from "./in-memory-product.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

function createMockCatalogRepositories(): Pick<
  ProductWriteScope,
  "categoryRepository" | "brandRepository" | "unitRepository"
> {
  const exists = async () => true;

  return {
    categoryRepository: { exists } as unknown as ICategoryRepository,
    brandRepository: { exists } as unknown as IBrandRepository,
    unitRepository: { exists } as unknown as IUnitRepository,
  };
}

type TransactionRunnerScope = Partial<ProductWriteScope> &
  Pick<ProductWriteScope, "repository" | "auditLogger">;

function buildWriteScope(scope: TransactionRunnerScope): ProductWriteScope {
  const catalogRepositories = createMockCatalogRepositories();

  return {
    categoryRepository:
      scope.categoryRepository ?? catalogRepositories.categoryRepository,
    brandRepository: scope.brandRepository ?? catalogRepositories.brandRepository,
    unitRepository: scope.unitRepository ?? catalogRepositories.unitRepository,
    repository: scope.repository,
    auditLogger: scope.auditLogger,
  };
}

export function createPassThroughTransactionRunner(
  scope: TransactionRunnerScope,
): IProductTransactionRunner {
  return {
    run: (operation) => operation(buildWriteScope(scope)),
  };
}

export function createRollbackTransactionRunner(
  repository: InMemoryProductRepository,
  auditLogger: MockAuditLogger,
  scope: Partial<
    Pick<
      ProductWriteScope,
      "categoryRepository" | "brandRepository" | "unitRepository"
    >
  > = {},
): IProductTransactionRunner {
  return {
    run: async (operation) => {
      const repositorySnapshot = repository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation(
          buildWriteScope({ repository, auditLogger, ...scope }),
        );
      } catch (error) {
        repository.restore(repositorySnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
