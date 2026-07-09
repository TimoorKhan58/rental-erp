import type { IRepairRepository } from "@/modules/repair/domain";
import type { IReturnRepository } from "@/modules/return/domain";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface RepairWriteScope {
  readonly repairRepository: IRepairRepository;
  readonly returnRepository: IReturnRepository;
  readonly rentalOrderRepository: IRentalOrderRepository;
  readonly inventoryRepository: IInventoryRepository;
  readonly stockMovementRepository: IStockMovementRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface IRepairTransactionRunner {
  run<T>(operation: (scope: RepairWriteScope) => Promise<T>): Promise<T>;
}
