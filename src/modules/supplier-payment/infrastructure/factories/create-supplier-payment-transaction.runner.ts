import type { ISupplierPaymentTransactionRunner } from "@/modules/supplier-payment/application/services/supplier-payment-transaction.runner";
import { createPurchaseOrderRepositoryFromUnitOfWork } from "@/modules/procurement/infrastructure/factories/create-purchase-order.repository";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";

import { createSupplierPaymentRepositoryFromUnitOfWork } from "./create-supplier-payment.repository";

export interface CreateSupplierPaymentTransactionRunnerOptions {
  userId?: string;
}

export function createSupplierPaymentTransactionRunner(
  deps: SharedDeps,
  options: CreateSupplierPaymentTransactionRunnerOptions = {},
): ISupplierPaymentTransactionRunner {
  return {
    run: (operation) =>
      runWithRepositoryUnitOfWork(deps, (context) =>
        operation({
          supplierPaymentRepository:
            createSupplierPaymentRepositoryFromUnitOfWork(context),
          purchaseOrderRepository:
            createPurchaseOrderRepositoryFromUnitOfWork(context),
          auditLogger: context.deps.auditLogger,
          userId: options.userId,
        }),
      ),
  };
}
