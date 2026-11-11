import { createAccountRepositoryFromUnitOfWork } from "@/modules/accounting/infrastructure/factories/create-account.repository";
import { createJournalEntryRepositoryFromUnitOfWork } from "@/modules/accounting/infrastructure/factories/create-journal-entry.repository";
import type { IPaymentTransactionRunner } from "@/modules/payment/application/services/payment-transaction.runner";
import { createRentalInvoiceRepositoryFromUnitOfWork } from "@/modules/rental-invoice/infrastructure/factories/create-rental-invoice.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createPaymentRepositoryFromUnitOfWork } from "./create-payment.repository";

export interface CreatePaymentTransactionRunnerOptions {
  userId?: string;
}

export function createPaymentTransactionRunner(
  deps: SharedDeps,
  options: CreatePaymentTransactionRunnerOptions = {},
): IPaymentTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          paymentRepository: createPaymentRepositoryFromUnitOfWork(context),
          rentalInvoiceRepository: createRentalInvoiceRepositoryFromUnitOfWork(
            context,
          ),
          accountRepository: createAccountRepositoryFromUnitOfWork(context),
          journalEntryRepository: createJournalEntryRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          notificationService: context.deps.notificationService,
          db: context.tx,
          userId: options.userId,
        }),
      ),
  };
}
