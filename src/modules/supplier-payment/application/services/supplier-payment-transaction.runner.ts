import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import type { IPurchaseOrderRepository } from "@/modules/procurement/domain/purchase-order.repository.interface";
import type { ISupplierPaymentRepository } from "@/modules/supplier-payment/domain/supplier-payment.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface SupplierPaymentWriteScope {
  readonly supplierPaymentRepository: ISupplierPaymentRepository;
  readonly purchaseOrderRepository: IPurchaseOrderRepository;
  readonly accountRepository: IAccountRepository;
  readonly journalEntryRepository: IJournalEntryRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface ISupplierPaymentTransactionRunner {
  run<T>(
    operation: (scope: SupplierPaymentWriteScope) => Promise<T>,
  ): Promise<T>;
}
