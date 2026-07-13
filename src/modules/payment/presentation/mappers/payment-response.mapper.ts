import type { PaymentDto } from "@/modules/payment/application/dtos/payment.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface PaymentResponse {
  id: string;
  paymentNumber: string;
  rentalInvoiceId: string;
  customerId: string;
  paymentDate: string;
  paymentMethod: PaymentDto["paymentMethod"];
  amount: number;
  isRefund: boolean;
  referenceNumber: string | null;
  notes: string | null;
  status: PaymentDto["status"];
  postedAt: string | null;
  voidedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentListResponse {
  items: PaymentResponse[];
  meta: PaginationMeta;
}

export function toPaymentResponse(dto: PaymentDto): PaymentResponse {
  return {
    id: dto.id,
    paymentNumber: dto.paymentNumber,
    rentalInvoiceId: dto.rentalInvoiceId,
    customerId: dto.customerId,
    paymentDate: dto.paymentDate,
    paymentMethod: dto.paymentMethod,
    amount: dto.amount,
    isRefund: dto.isRefund,
    referenceNumber: dto.referenceNumber,
    notes: dto.notes,
    status: dto.status,
    postedAt: dto.postedAt,
    voidedAt: dto.voidedAt,
    createdById: dto.createdById,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toPaymentListResponse(
  result: PaginatedResult<PaymentDto>,
): PaymentListResponse {
  return {
    items: result.items.map(toPaymentResponse),
    meta: result.meta,
  };
}
