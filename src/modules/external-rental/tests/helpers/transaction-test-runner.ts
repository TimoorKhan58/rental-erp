import type {
  ExternalRentalWriteScope,
  IExternalRentalTransactionRunner,
} from "@/modules/external-rental/application/services/external-rental-transaction.runner";
import { runWithAvailabilityCommitLockScope } from "@/modules/inventory/infrastructure/availability-commit-lock";
import { runWithReserveCommandLockScope } from "@/modules/rental-order/infrastructure/reserve-command-lock";
import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";

import { createExternalRentalWriteScope } from "./external-rental-write-scope.factory";

export function createPassThroughExternalRentalTransactionRunner(
  scope: Pick<ExternalRentalWriteScope, "externalRentalRepository" | "auditLogger"> &
    Partial<Omit<ExternalRentalWriteScope, "externalRentalRepository" | "auditLogger">>,
): IExternalRentalTransactionRunner {
  const fullScope = createExternalRentalWriteScope(scope);

  return {
    run: (operation) =>
      runWithAvailabilityCommitLockScope(() =>
        runWithReserveCommandLockScope(() => operation(fullScope)),
      ),
  };
}

export function createRollbackExternalRentalTransactionRunner(
  scope: Pick<ExternalRentalWriteScope, "externalRentalRepository" | "auditLogger"> &
    Partial<Omit<ExternalRentalWriteScope, "externalRentalRepository" | "auditLogger">>,
): IExternalRentalTransactionRunner {
  const fullScope = createExternalRentalWriteScope(scope);
  const { externalRentalRepository, auditLogger } = fullScope;

  return {
    run: async (operation) => {
      const rentalSnapshot = externalRentalRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();
      const rentalOrderSnapshot =
        "snapshot" in fullScope.rentalOrderRepository
          ? (fullScope.rentalOrderRepository as InMemoryRentalOrderRepository).snapshot()
          : undefined;
      const inventorySnapshot =
        "snapshot" in fullScope.inventoryRepository
          ? (fullScope.inventoryRepository as InMemoryInventoryRepository).snapshot()
          : undefined;

      try {
        return await runWithAvailabilityCommitLockScope(() =>
          runWithReserveCommandLockScope(() => operation(fullScope)),
        );
      } catch (error) {
        externalRentalRepository.restore(rentalSnapshot);
        auditLogger.restore(auditSnapshot);
        if (rentalOrderSnapshot !== undefined) {
          (fullScope.rentalOrderRepository as InMemoryRentalOrderRepository).restore(
            rentalOrderSnapshot,
          );
        }
        if (inventorySnapshot !== undefined) {
          (fullScope.inventoryRepository as InMemoryInventoryRepository).restore(
            inventorySnapshot,
          );
        }
        throw error;
      }
    },
  };
}
