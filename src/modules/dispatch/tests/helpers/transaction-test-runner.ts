import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import type { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import type {
  DispatchWriteScope,
  IDispatchTransactionRunner,
} from "@/modules/dispatch/application/services/dispatch-transaction.runner";

import type { InMemoryDispatchRepository } from "./in-memory-dispatch.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: DispatchWriteScope,
): IDispatchTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  dispatchRepository: InMemoryDispatchRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): IDispatchTransactionRunner {
  return {
    run: async (operation) => {
      const dispatchSnapshot = dispatchRepository.snapshot();
      const rentalOrderSnapshot = rentalOrderRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          dispatchRepository,
          rentalOrderRepository,
          inventoryRepository,
          stockMovementRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        dispatchRepository.restore(dispatchSnapshot);
        rentalOrderRepository.restore(rentalOrderSnapshot);
        inventoryRepository.restore(inventorySnapshot);
        stockMovementRepository.restore(stockMovementSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
