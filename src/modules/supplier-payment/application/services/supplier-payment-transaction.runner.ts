import type { IPurchaseOrderRepository } from "@/modules/procurement/domain/purchase-order.repository.interface";
import type { ISupplierPaymentRepository } from "@/modules/supplier-payment/domain/supplier-payment.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface SupplierPaymentWriteScope {
  readonly supplierPaymentRepository: ISupplierPaymentRepository;
  readonly purchaseOrderRepository: IPurchaseOrderRepository;
  readonly auditLogger: IAuditLogger;
  readonly userId: string | undefined;
}

export interface ISupplierPaymentTransactionRunner {
  run<T>(
    operation: (scope: SupplierPaymentWriteScope) => Promise<T>,
  ): Promise<T>;
}
