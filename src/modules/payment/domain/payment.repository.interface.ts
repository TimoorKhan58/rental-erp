import type { PaymentId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Payment } from "./payment.entity";
import type { PaymentListQuery } from "./payment-list.query";
import type {
  CreatePaymentData,
  UpdatePaymentData,
  UpdatePaymentStatusData,
} from "./payment.types";

export interface IPaymentRepository {
  findById(id: PaymentId): Promise<Payment | null>;
  findByPaymentNumber(paymentNumber: string): Promise<Payment | null>;
  findPaged(query: PaymentListQuery): Promise<PaginatedResult<Payment>>;
  create(data: CreatePaymentData): Promise<Payment>;
  update(id: PaymentId, data: UpdatePaymentData): Promise<Payment>;
  updateStatus(
    id: PaymentId,
    data: UpdatePaymentStatusData,
  ): Promise<Payment>;
}
