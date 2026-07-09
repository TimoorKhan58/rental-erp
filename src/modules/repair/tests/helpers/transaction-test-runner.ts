import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import type { InMemoryReturnRepository } from "@/modules/return/tests/helpers/in-memory-return.repository";
import type { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";
import type {
  IRepairTransactionRunner,
  RepairWriteScope,
} from "@/modules/repair/application/services/repair-transaction.runner";

import type { InMemoryRepairRepository } from "./in-memory-repair.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: RepairWriteScope,
): IRepairTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  repairRepository: InMemoryRepairRepository,
  returnRepository: InMemoryReturnRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): IRepairTransactionRunner {
  return {
    run: async (operation) => {
      const repairSnapshot = repairRepository.snapshot();
      const returnSnapshot = returnRepository.snapshot();
      const rentalOrderSnapshot = rentalOrderRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          repairRepository,
          returnRepository,
          rentalOrderRepository,
          inventoryRepository,
          stockMovementRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        repairRepository.restore(repairSnapshot);
        returnRepository.restore(returnSnapshot);
        rentalOrderRepository.restore(rentalOrderSnapshot);
        inventoryRepository.restore(inventorySnapshot);
        stockMovementRepository.restore(stockMovementSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
