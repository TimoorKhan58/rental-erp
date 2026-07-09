import type { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import type {
  IMaintenanceTransactionRunner,
  MaintenanceWriteScope,
} from "@/modules/maintenance/application/services/maintenance-transaction.runner";
import type { InMemoryStockMovementRepository } from "@/modules/stock-movement/tests/helpers/in-memory-stock-movement.repository";

import type { InMemoryMaintenanceRepository } from "./in-memory-maintenance.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: MaintenanceWriteScope,
): IMaintenanceTransactionRunner {
  return {
    run: (operation) => operation(scope),
  };
}

export function createRollbackTransactionRunner(
  maintenanceRepository: InMemoryMaintenanceRepository,
  inventoryRepository: InMemoryInventoryRepository,
  stockMovementRepository: InMemoryStockMovementRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): IMaintenanceTransactionRunner {
  return {
    run: async (operation) => {
      const maintenanceSnapshot = maintenanceRepository.snapshot();
      const inventorySnapshot = inventoryRepository.snapshot();
      const stockMovementSnapshot = stockMovementRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await operation({
          maintenanceRepository,
          inventoryRepository,
          stockMovementRepository,
          auditLogger,
          userId,
        });
      } catch (error) {
        maintenanceRepository.restore(maintenanceSnapshot);
        inventoryRepository.restore(inventorySnapshot);
        stockMovementRepository.restore(stockMovementSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
