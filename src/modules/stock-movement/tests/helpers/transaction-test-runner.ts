import type { StockMovementWriteScope } from "@/modules/stock-movement/application/services/stock-movement-transaction.runner";
import type { IStockMovementTransactionRunner } from "@/modules/stock-movement/application/services/stock-movement-transaction.runner";

import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";

import type { InMemoryStockMovementRepository } from "./in-memory-stock-movement.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: StockMovementWriteScope,
): IStockMovementTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  stockMovementRepository: InMemoryStockMovementRepository,
  inventoryRepository: InMemoryInventoryRepository,
  auditLogger: MockAuditLogger,
  userId?: string,
): IStockMovementTransactionRunner {
  return {
    run: async (operation) => {
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          stockMovementRepository,
          inventoryRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        stockMovementRepository.restore(stockMovementSnapshot);
        inventoryRepository.restore(inventorySnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
