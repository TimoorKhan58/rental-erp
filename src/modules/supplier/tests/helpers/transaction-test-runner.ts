import type { SupplierWriteScope } from "@/modules/supplier/application/services/supplier-transaction.runner";
import type { ISupplierTransactionRunner } from "@/modules/supplier/application/services/supplier-transaction.runner";

import type { InMemorySupplierRepository } from "./in-memory-supplier.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: SupplierWriteScope,
): ISupplierTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  repository: InMemorySupplierRepository,
  auditLogger: MockAuditLogger,
): ISupplierTransactionRunner {
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
