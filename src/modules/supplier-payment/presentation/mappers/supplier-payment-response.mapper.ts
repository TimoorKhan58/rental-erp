import type { SupplierPaymentDto } from "@/modules/supplier-payment/application/dtos/supplier-payment.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface SupplierPaymentResponse {
  id: string;
  paymentNumber: string;
  purchaseOrderId: string;
  supplierId: string;
  paymentDate: string;
  paymentMethod: SupplierPaymentDto["paymentMethod"];
  amount: number;
  referenceNumber: string | null;
  notes: string | null;
  status: SupplierPaymentDto["status"];
  postedAt: string | null;
  voidedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPaymentListResponse {
  items: SupplierPaymentResponse[];
  meta: PaginationMeta;
}

export function toSupplierPaymentResponse(
  dto: SupplierPaymentDto,
): SupplierPaymentResponse {
  return {
    id: dto.id,
    paymentNumber: dto.paymentNumber,
    purchaseOrderId: dto.purchaseOrderId,
    supplierId: dto.supplierId,
    paymentDate: dto.paymentDate,
    paymentMethod: dto.paymentMethod,
    amount: dto.amount,
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

export function toSupplierPaymentListResponse(
  result: PaginatedResult<SupplierPaymentDto>,
): SupplierPaymentListResponse {
  return {
    items: result.items.map(toSupplierPaymentResponse),
    meta: result.meta,
  };
}
