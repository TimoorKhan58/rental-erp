import type { WarehouseWriteScope } from "@/modules/warehouse/application/services/warehouse-transaction.runner";
import type { IWarehouseTransactionRunner } from "@/modules/warehouse/application/services/warehouse-transaction.runner";

import type { InMemoryWarehouseRepository } from "./in-memory-warehouse.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: WarehouseWriteScope,
): IWarehouseTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  repository: InMemoryWarehouseRepository,
  auditLogger: MockAuditLogger,
): IWarehouseTransactionRunner {
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
