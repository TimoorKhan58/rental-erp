import { createAccountRepositoryFromUnitOfWork } from "@/modules/accounting/infrastructure/factories/create-account.repository";
import { createJournalEntryRepositoryFromUnitOfWork } from "@/modules/accounting/infrastructure/factories/create-journal-entry.repository";
import type { IExternalRentalTransactionRunner } from "@/modules/external-rental/application/services/external-rental-transaction.runner";
import { createInventoryRepositoryFromUnitOfWork } from "@/modules/inventory/infrastructure/factories/create-inventory.repository";
import { createRentalOrderRepositoryFromUnitOfWork } from "@/modules/rental-order/infrastructure/factories/create-rental-order.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createExternalRentalRepositoryFromUnitOfWork } from "./create-external-rental.repository";

export interface CreateExternalRentalTransactionRunnerOptions {
  userId?: string;
}

export function createExternalRentalTransactionRunner(
  deps: SharedDeps,
  options: CreateExternalRentalTransactionRunnerOptions = {},
): IExternalRentalTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          externalRentalRepository:
            createExternalRentalRepositoryFromUnitOfWork(context),
          rentalOrderRepository:
            createRentalOrderRepositoryFromUnitOfWork(context),
          inventoryRepository: createInventoryRepositoryFromUnitOfWork(context),
          accountRepository: createAccountRepositoryFromUnitOfWork(context),
          journalEntryRepository: createJournalEntryRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          userId: options.userId,
        }),
      ),
  };
}
