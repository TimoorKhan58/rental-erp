import type { IReturnTransactionRunner } from "@/modules/return/application/services/return-transaction.runner";
import { createDispatchRepositoryFromUnitOfWork } from "@/modules/dispatch/infrastructure/factories/create-dispatch.repository";
import { createInventoryRepositoryFromUnitOfWork } from "@/modules/inventory/infrastructure/factories/create-inventory.repository";
import { createPaymentRepositoryFromUnitOfWork } from "@/modules/payment/infrastructure/factories/create-payment.repository";
import { createRentalInvoiceRepositoryFromUnitOfWork } from "@/modules/rental-invoice/infrastructure/factories/create-rental-invoice.repository";
import { createRentalOrderRepositoryFromUnitOfWork } from "@/modules/rental-order/infrastructure/factories/create-rental-order.repository";
import { createStockMovementRepositoryFromUnitOfWork } from "@/modules/stock-movement/infrastructure/factories/create-stock-movement.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createReturnRepositoryFromUnitOfWork } from "./create-return.repository";

export interface CreateReturnTransactionRunnerOptions {
  userId?: string;
}

export function createReturnTransactionRunner(
  deps: SharedDeps,
  options: CreateReturnTransactionRunnerOptions = {},
): IReturnTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          returnRepository: createReturnRepositoryFromUnitOfWork(context),
          dispatchRepository: createDispatchRepositoryFromUnitOfWork(context),
          rentalOrderRepository: createRentalOrderRepositoryFromUnitOfWork(context),
          inventoryRepository: createInventoryRepositoryFromUnitOfWork(context),
          stockMovementRepository: createStockMovementRepositoryFromUnitOfWork(
            context,
          ),
          paymentRepository: createPaymentRepositoryFromUnitOfWork(context),
          rentalInvoiceRepository:
            createRentalInvoiceRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          userId: options.userId,
        }),
      ),
  };
}
