import type { ProductWriteScope } from "@/modules/product/application/services/product-transaction.runner";
import type { IProductTransactionRunner } from "@/modules/product/application/services/product-transaction.runner";

import type { InMemoryProductRepository } from "./in-memory-product.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: ProductWriteScope,
): IProductTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  repository: InMemoryProductRepository,
  auditLogger: MockAuditLogger,
): IProductTransactionRunner {
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
