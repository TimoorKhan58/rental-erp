import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import type { IMaintenanceRepository } from "@/modules/maintenance/domain";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type { IStockMovementRepository } from "@/modules/stock-movement/domain/stock-movement.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface MaintenanceWriteScope {
  readonly maintenanceRepository: IMaintenanceRepository;
  readonly inventoryRepository: IInventoryRepository;
  readonly stockMovementRepository: IStockMovementRepository;
  /** Books (2026-11-20): optional so older test doubles stay valid. */
  readonly accountRepository?: IAccountRepository;
  readonly journalEntryRepository?: IJournalEntryRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface IMaintenanceTransactionRunner {
  run<T>(operation: (scope: MaintenanceWriteScope) => Promise<T>): Promise<T>;
}
