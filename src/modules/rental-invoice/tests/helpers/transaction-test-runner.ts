import { InMemoryAccountRepository } from "@/modules/accounting/tests/helpers/in-memory-account.repository";
import { InMemoryJournalEntryRepository } from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";
import type { InMemoryCustomerRepository } from "@/modules/customer/tests/helpers/in-memory-customer.repository";
import { InMemoryPaymentRepository } from "@/modules/payment/tests/helpers/in-memory-payment.repository";
import type { InMemoryRentalOrderRepository } from "@/modules/rental-order/tests/helpers/in-memory-rental-order.repository";
import type {
  IRentalInvoiceTransactionRunner,
  RentalInvoiceWriteScope,
} from "@/modules/rental-invoice/application/services/rental-invoice-transaction.runner";
import { runWithPaymentCommitmentLockScope } from "@/modules/payment/infrastructure/payment-commitment-lock";
import { mockNotificationWriteScopeDeps } from "@/shared/infrastructure/notifications/test-helpers/mock-notification-deps";

import type { InMemoryRentalInvoiceRepository } from "./in-memory-rental-invoice.repository";
import type { InMemoryRentalOrderInvoiceLookup } from "./in-memory-rental-order-invoice.lookup";
import type { MockAuditLogger } from "./mock-audit-logger";

export function createPassThroughTransactionRunner(
  scope: RentalInvoiceWriteScope,
): IRentalInvoiceTransactionRunner {
  return {
    run: (operation) =>
      runWithPaymentCommitmentLockScope(() => operation(scope)),
  };
}

export function createRollbackTransactionRunner(
  rentalInvoiceRepository: InMemoryRentalInvoiceRepository,
  rentalOrderRepository: InMemoryRentalOrderRepository,
  rentalOrderInvoiceLookup: InMemoryRentalOrderInvoiceLookup,
  customerRepository: InMemoryCustomerRepository,
  auditLogger: MockAuditLogger,
  userId: string | undefined,
  paymentRepository: InMemoryPaymentRepository = new InMemoryPaymentRepository(),
): IRentalInvoiceTransactionRunner {
  return {
    run: async (operation) => {
      const invoiceSnapshot = rentalInvoiceRepository.snapshot();
      const auditSnapshot = auditLogger.snapshot();

      try {
        return await runWithPaymentCommitmentLockScope(() =>
          operation({
          rentalInvoiceRepository,
          paymentRepository,
          rentalOrderRepository,
          rentalOrderInvoiceLookup,
          customerRepository,
          accountRepository: new InMemoryAccountRepository(),
          journalEntryRepository: new InMemoryJournalEntryRepository(),
          auditLogger,
          ...mockNotificationWriteScopeDeps,
          userId,
        }),
        );
      } catch (error) {
        rentalInvoiceRepository.restore(invoiceSnapshot);
        auditLogger.restore(auditSnapshot);
        throw error;
      }
    },
  };
}
