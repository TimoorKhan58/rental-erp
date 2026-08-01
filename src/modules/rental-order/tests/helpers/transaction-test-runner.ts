import type { RentalOrderWriteScope } from "@/modules/rental-order/application/services/rental-order-transaction.runner";
import type { IRentalOrderTransactionRunner } from "@/modules/rental-order/application/services/rental-order-transaction.runner";
import type { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";

import type { InMemoryRentalOrderRepository } from "./in-memory-rental-order.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: RentalOrderWriteScope,
): IRentalOrderTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  rentalOrderRepository: InMemoryRentalOrderRepository,
  dispatchRepository: InMemoryDispatchRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): IRentalOrderTransactionRunner {
  return {
    run: async (operation) => {
      const rentalOrderSnapshot = rentalOrderRepository.snapshot();
      const dispatchSnapshot = dispatchRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          rentalOrderRepository,
          dispatchRepository,
          inventoryRepository,
          stockMovementRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        rentalOrderRepository.restore(rentalOrderSnapshot);
        dispatchRepository.restore(dispatchSnapshot);
        inventoryRepository.restore(inventorySnapshot);
        stockMovementRepository.restore(stockMovementSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
