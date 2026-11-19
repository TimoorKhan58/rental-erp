import { InMemoryAccountRepository } from "@/modules/accounting/tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";
import type { InMemoryPurchaseOrderRepository } from "@/modules/procurement/tests/helpers/in-memory-purchase-order.repository";
import type {
  ISupplierPaymentTransactionRunner,
  SupplierPaymentWriteScope,
} from "@/modules/supplier-payment/application/services/supplier-payment-transaction.runner";
import { runWithSupplierPaymentCommitmentLockScope } from "@/modules/supplier-payment/infrastructure/supplier-payment-commitment-lock";

import type { InMemorySupplierPaymentRepository } from "./in-memory-supplier-payment.repository";
import type { MockAuditLogger } from "./mock-audit-logger";

/** Accounting books are optional in tests; empty in-memory ones are used when absent. */
export function createPassThroughTransactionRunner(
  scope: Omit<SupplierPaymentWriteScope, "accountRepository" | "journalEntryRepository"> &
    Partial<Pick<SupplierPaymentWriteScope, "accountRepository" | "journalEntryRepository">>,
): ISupplierPaymentTransactionRunner {
  const fullScope: SupplierPaymentWriteScope = {
    ...scope,
    accountRepository: scope.accountRepository ?? new InMemoryAccountRepository(),
    journalEntryRepository: scope.journalEntryRepository ?? new InMemoryJournalEntryRepository(),
  };
  return {
    run: (operation) =>
      runWithSupplierPaymentCommitmentLockScope(() => operation(fullScope)),
  };
}

export function createRollbackTransactionRunner(
  supplierPaymentRepository: InMemorySupplierPaymentRepository,
  purchaseOrderRepository: InMemoryPurchaseOrderRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
): ISupplierPaymentTransactionRunner {
  return {
    run: async (operation) => {
      const paymentSnapshot = supplierPaymentRepository.snapshot();
      const purchaseOrderSnapshot = purchaseOrderRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await runWithSupplierPaymentCommitmentLockScope(() =>
          operation({
            supplierPaymentRepository,
            purchaseOrderRepository,
            accountRepository: new InMemoryAccountRepository(),
            journalEntryRepository: new InMemoryJournalEntryRepository(),
            auditLogger,
            userId,
          }),
        );
      } catch (error) {
        supplierPaymentRepository.restore(paymentSnapshot);
        purchaseOrderRepository.restore(purchaseOrderSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
