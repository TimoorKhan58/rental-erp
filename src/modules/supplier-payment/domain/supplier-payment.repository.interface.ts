import type { SupplierPaymentId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { SupplierPayment } from "./supplier-payment.entity";
import type { SupplierPaymentListQuery } from "./supplier-payment-list.query";
import type {
  CreateSupplierPaymentData,
  UpdateSupplierPaymentStatusData,
} from "./supplier-payment.types";

export interface ISupplierPaymentRepository {
  findById(id: SupplierPaymentId): Promise<SupplierPayment | null>;
  findByPaymentNumber(paymentNumber: string): Promise<SupplierPayment | null>;
  findPaged(
    query: SupplierPaymentListQuery,
  ): Promise<PaginatedResult<SupplierPayment>>;
  create(data: CreateSupplierPaymentData): Promise<SupplierPayment>;
  updateStatus(
    id: SupplierPaymentId,
    data: UpdateSupplierPaymentStatusData,
  ): Promise<SupplierPayment>;
}
