import type { IRentalInvoiceTransactionRunner } from "@/modules/rental-invoice/application/services/rental-invoice-transaction.runner";
import { createCustomerRepositoryFromUnitOfWork } from "@/modules/customer/infrastructure/factories/create-customer.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createRentalInvoiceRepositoryFromUnitOfWork } from "./create-rental-invoice.repository";
import { createRentalOrderInvoiceLookupFromUnitOfWork } from "../lookups/prisma-rental-order-invoice.lookup";

export interface CreateRentalInvoiceTransactionRunnerOptions {
  userId?: string;
}

export function createRentalInvoiceTransactionRunner(
  deps: SharedDeps,
  options: CreateRentalInvoiceTransactionRunnerOptions = {},
): IRentalInvoiceTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          rentalInvoiceRepository: createRentalInvoiceRepositoryFromUnitOfWork(
            context,
          ),
          rentalOrderInvoiceLookup: createRentalOrderInvoiceLookupFromUnitOfWork(
            context,
          ),
          customerRepository: createCustomerRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          userId: options.userId,
        }),
      ),
  };
}
