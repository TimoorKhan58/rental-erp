import type { PurchaseOrderWriteScope } from "@/modules/procurement/application/services/purchase-order-transaction.runner";
import type { IPurchaseOrderTransactionRunner } from "@/modules/procurement/application/services/purchase-order-transaction.runner";
import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";

import type { InMemoryPurchaseOrderRepository } from "./in-memory-purchase-order.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: PurchaseOrderWriteScope,
): IPurchaseOrderTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  purchaseOrderRepository: InMemoryPurchaseOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): IPurchaseOrderTransactionRunner {
  return {
    run: async (operation) => {
      const purchaseOrderSnapshot = purchaseOrderRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          purchaseOrderRepository,
          inventoryRepository,
          stockMovementRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        purchaseOrderRepository.restore(purchaseOrderSnapshot);
        inventoryRepository.restore(inventorySnapshot);
        stockMovementRepository.restore(stockMovementSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
