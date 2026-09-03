import type { PaymentId, RentalInvoiceId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Payment } from "./payment.entity";
import type { PaymentListQuery } from "./payment-list.query";
import type { PaymentSummaryQuery } from "./payment-summary.query";
import type { PaymentSummaryResult } from "./payment-summary.types";
import type {
  CreatePaymentData,
  UpdatePaymentData,
  UpdatePaymentStatusData,
} from "./payment.types";

export interface IPaymentRepository {
  findById(id: PaymentId): Promise<Payment | null>;
  findByPaymentNumber(paymentNumber: string): Promise<Payment | null>;
  findPaged(query: PaymentListQuery): Promise<PaginatedResult<Payment>>;
  findSummaryStats(query: PaymentSummaryQuery): Promise<PaymentSummaryResult>;
  sumPendingAmountByRentalInvoiceId(
    rentalInvoiceId: RentalInvoiceId,
    excludePaymentId?: PaymentId,
  ): Promise<number>;
  /** Count of live POSTED payments referencing the invoice (Phase 52 / N-44-05). */
  countPostedPaymentsByRentalInvoiceId(
    rentalInvoiceId: RentalInvoiceId,
  ): Promise<number>;
  create(data: CreatePaymentData): Promise<Payment>;
  update(id: PaymentId, data: UpdatePaymentData): Promise<Payment>;
  updateStatus(
    id: PaymentId,
    data: UpdatePaymentStatusData,
  ): Promise<Payment>;
  claimStatusTransition(
    id: PaymentId,
    expected: Payment["status"] | ReadonlyArray<Payment["status"]>,
    data: UpdatePaymentStatusData,
  ): Promise<Payment | null>;
}
