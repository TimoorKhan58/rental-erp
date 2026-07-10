import type { AssetWriteScope } from "@/modules/asset/application/services/asset-transaction.runner";
import type { IAssetTransactionRunner } from "@/modules/asset/application/services/asset-transaction.runner";
import type { CategoryWriteScope } from "@/modules/asset/application/services/category-transaction.runner";
import type { ICategoryTransactionRunner } from "@/modules/asset/application/services/category-transaction.runner";

import type { InMemoryAssetCategoryRepository } from "./in-memory-asset-category.repository";
import type { InMemoryAssetRepository } from "./in-memory-asset.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughAssetTransactionRunner(
  scope: AssetWriteScope,
): IAssetTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackAssetTransactionRunner(
  assetRepository: InMemoryAssetRepository,
  auditLogger: MockAuditLogger,
  scope: Omit<AssetWriteScope, "assetRepository" | "auditLogger">,
): IAssetTransactionRunner {
  return {
    run: async (operation) => {
      const assetSnapshot = assetRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          assetRepository,
          auditLogger,
          ...scope,
        });
      } catch (error) {
        assetRepository.restore(assetSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}

export function createPassThroughCategoryTransactionRunner(
  scope: CategoryWriteScope,
): ICategoryTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackCategoryTransactionRunner(
  repository: InMemoryAssetCategoryRepository,
  auditLogger: MockAuditLogger,
): ICategoryTransactionRunner {
  return {
    run: async (operation) => {
      const repositorySnapshot = repository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({ repository, auditLogger });
      } catch (error) {
        repository.restore(repositorySnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
