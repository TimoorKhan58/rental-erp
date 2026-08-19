import type { RentalOrderWriteScope } from "@/modules/rental-order/application/services/rental-order-transaction.runner";
import type { IRentalOrderTransactionRunner } from "@/modules/rental-order/application/services/rental-order-transaction.runner";
import { runWithAvailabilityCommitLockScope } from "@/modules/inventory/infrastructure/availability-commit-lock";
import { runWithReserveCommandLockScope } from "@/modules/rental-order/infrastructure/reserve-command-lock";
import { InMemoryDispatchRepository } from "@/modules/dispatch/tests/helpers/in-memory-dispatch.repository";
import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import type { InMemoryExternalRentalRepository } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { InMemoryExternalRentalRepository as ExternalRentalRepo } from "@/modules/external-rental/tests/helpers/in-memory-external-rental.repository";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import type { InMemoryRentalOrderRepository } from "./in-memory-rental-order.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: RentalOrderWriteScope,
): IRentalOrderTransactionRunner {
  return {
    run: (operation) =>
      runWithAvailabilityCommitLockScope(() =>
        runWithReserveCommandLockScope(() => operation(scope)),
      ),
  };
}

export function createRollbackTransactionRunner(
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
  dispatchRepository: InMemoryDispatchRepository = new InMemoryDispatchRepository(),
  externalRentalRepository: InMemoryExternalRentalRepository = new ExternalRentalRepo(),
): IRentalOrderTransactionRunner {
  return {
    run: async (operation) => {
      const rentalOrderSnapshot = rentalOrderRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();
      const dispatchSnapshot = dispatchRepository.snapshot();
      const externalSnapshot = externalRentalRepository.snapshot();

      try {
        return await runWithAvailabilityCommitLockScope(() =>
          runWithReserveCommandLockScope(() =>
            operation({
              rentalOrderRepository,
              inventoryRepository,
              stockMovementRepository,
              dispatchRepository,
              externalRentalRepository,
              auditLogger,
              ...mockNotificationWriteScopeDeps,
              userId,
            }),
          ),
        );
      } catch (error) {
        rentalOrderRepository.restore(rentalOrderSnapshot);
        inventoryRepository.restore(inventorySnapshot);
        stockMovementRepository.restore(stockMovementSnapshot);
        auditLogger.restore(auditSnapshot);
        dispatchRepository.restore(dispatchSnapshot);
        externalRentalRepository.restore(externalSnapshot);
        throw error;
      }
    },
  };
}
