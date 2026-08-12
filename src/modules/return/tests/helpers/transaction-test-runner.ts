import type { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import type { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import type { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { InMemoryExternalRentalRepository as ExternalRentalRepo } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import type {
  IReturnTransactionRunner,
  ReturnWriteScope,
} from "@/modules/return/application/services/return-transaction.runner";

import type { InMemoryReturnRepository } from "./in-memory-return.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: ReturnWriteScope,
): IReturnTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  returnRepository: InMemoryReturnRepository,
  dispatchRepository: InMemoryDispatchRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
  externalRentalRepository: InMemoryExternalRentalRepository = new ExternalRentalRepo(),
): IReturnTransactionRunner {
  return {
    run: async (operation) => {
      const returnSnapshot = returnRepository.snapshot();
      const dispatchSnapshot = dispatchRepository.snapshot();
      const rentalOrderSnapshot = rentalOrderRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const externalSnapshot = externalRentalRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          returnRepository,
          dispatchRepository,
          rentalOrderRepository,
          inventoryRepository,
          stockMovementRepository,
          externalRentalRepository,
          auditLogger,
          ...mockNotificationWriteScopeDeps,
          userId,
        });
      } catch (error) {
        returnRepository.restore(returnSnapshot);
        dispatchRepository.restore(dispatchSnapshot);
        rentalOrderRepository.restore(rentalOrderSnapshot);
        inventoryRepository.restore(inventorySnapshot);
        stockMovementRepository.restore(stockMovementSnapshot);
        externalRentalRepository.restore(externalSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
