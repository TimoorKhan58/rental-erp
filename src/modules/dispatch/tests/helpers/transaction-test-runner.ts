import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import type { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import type { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { InMemoryExternalRentalRepository as ExternalRentalRepo } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";
import type {
  DispatchWriteScope,
  IDispatchTransactionRunner,
} from "@/modules/dispatch/application/services/dispatch-transaction.runner";
import { runWithDispatchClaimLockScope } from "@/modules/dispatch/infrastructure/dispatch-claim-lock";

import type { InMemoryDispatchRepository } from "./in-memory-dispatch.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: DispatchWriteScope,
): IDispatchTransactionRunner {
  return {
    run: (operation) =>
      runWithDispatchClaimLockScope(() => operation(scope)),
  };
}

export function createRollbackTransactionRunner(
  dispatchRepository: InMemoryDispatchRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
  externalRentalRepository: InMemoryExternalRentalRepository = new ExternalRentalRepo(),
): IDispatchTransactionRunner {
  return {
    run: async (operation) => {
      const dispatchSnapshot = dispatchRepository.snapshot();
      const rentalOrderSnapshot = rentalOrderRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const externalSnapshot = externalRentalRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await runWithDispatchClaimLockScope(() =>
          operation({
            dispatchRepository,
            rentalOrderRepository,
            inventoryRepository,
            stockMovementRepository,
            externalRentalRepository,
            auditLogger,
            ...mockNotificationWriteScopeDeps,
            userId,
          }),
        );
      } catch (error) {
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
