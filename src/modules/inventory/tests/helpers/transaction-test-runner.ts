import type { InventoryWriteScope } from "@/modules/inventory/application/services/inventory-transaction.runner";
import type { IInventoryTransactionRunner } from "@/modules/inventory/application/services/inventory-transaction.runner";

import type { InMemoryInventoryRepository } from "./in-memory-inventory.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: InventoryWriteScope,
): IInventoryTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  repository: InMemoryInventoryRepository,
  auditLogger: MockAuditLogger,
): IInventoryTransactionRunner {
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
