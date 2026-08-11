import type { RentalOrderWriteScope } from "@/modules/rental-order/application/services/rental-order-transaction.runner";
import type { IRentalOrderTransactionRunner } from "@/modules/rental-order/application/services/rental-order-transaction.runner";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

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
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
  dispatchRepository: InMemoryDispatchRepository = new InMemoryDispatchRepository(),
): IRentalOrderTransactionRunner {
  return {
    run: async (operation) => {
      const rentalOrderSnapshot = rentalOrderRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();
      const dispatchSnapshot = dispatchRepository.snapshot();

      try {
        return await operation({
          rentalOrderRepository,
          inventoryRepository,
          stockMovementRepository,
          dispatchRepository,
          auditLogger,
          ...mockNotificationWriteScopeDeps,
          userId,
        });
      } catch (error) {
        rentalOrderRepository.restore(rentalOrderSnapshot);
        inventoryRepository.restore(inventorySnapshot);
        stockMovementRepository.restore(stockMovementSnapshot);
        auditLogger.restore(auditSnapshot);
        dispatchRepository.restore(dispatchSnapshot);
        throw error;
      }
    },
  };
}
