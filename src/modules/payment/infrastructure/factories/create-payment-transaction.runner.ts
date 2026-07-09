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
          auditLogger: context.deps.auditLogger,
          userId: options.userId,
        }),
      ),
  };
}
