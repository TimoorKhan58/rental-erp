import type { IExternalRentalRepository } from "@/modules/external-rental/domain";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface ExternalRentalWriteScope {
  readonly externalRentalRepository: IExternalRentalRepository;
  readonly rentalOrderRepository: IRentalOrderRepository;
  readonly inventoryRepository: IInventoryRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface IExternalRentalTransactionRunner {
  run<T>(
    operation: (scope: ExternalRentalWriteScope) => Promise<T>,
  ): Promise<T>;
}
