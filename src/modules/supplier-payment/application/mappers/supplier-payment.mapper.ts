import type { SupplierPayment } from "@/modules/supplier-payment/domain/supplier-payment.entity";
import type { SupplierPaymentListQuery } from "@/modules/supplier-payment/domain/supplier-payment-list.query";
import type { CreateSupplierPaymentData } from "@/modules/supplier-payment/domain/supplier-payment.types";
import type {
  PurchaseOrderId,
  SupplierId,
  SupplierPaymentId,
  UserId,
} from "@/shared/domain/ids";

import type { SupplierPaymentDto } from "../dtos/supplier-payment.dto";
import type { CreateSupplierPaymentInput } from "../schemas/supplier-payment.schemas";
import type { ListSupplierPaymentsInput } from "../schemas/list-supplier-payments.schema";

export function toSupplierPaymentDto(
  payment: SupplierPayment,
): SupplierPaymentDto {
  const props = payment.toProps();

  return {
    id: props.id,
    paymentNumber: props.paymentNumber,
    purchaseOrderId: props.purchaseOrderId,
    supplierId: props.supplierId,
    paymentDate: props.paymentDate.toISOString(),
    paymentMethod: props.paymentMethod,
    amount: props.amount,
    referenceNumber: props.referenceNumber,
    notes: props.notes,
    status: props.status,
    postedAt: props.postedAt?.toISOString() ?? null,
    voidedAt: props.voidedAt?.toISOString() ?? null,
    createdById: props.createdById,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateSupplierPaymentData(
  input: Omit<CreateSupplierPaymentInput, "paymentNumber"> & {
    paymentNumber: string;
  },
  createdById: UserId,
): CreateSupplierPaymentData {
  return {
    paymentNumber: input.paymentNumber,
    purchaseOrderId: input.purchaseOrderId as PurchaseOrderId,
    supplierId: input.supplierId as SupplierId,
    paymentDate: input.paymentDate,
    paymentMethod: input.paymentMethod,
    amount: input.amount,
    referenceNumber: input.referenceNumber ?? null,
    notes: input.notes ?? null,
    createdById,
  };
}

export function toSupplierPaymentId(id: string): SupplierPaymentId {
  return id as SupplierPaymentId;
}

export function toPurchaseOrderId(id: string): PurchaseOrderId {
  return id as PurchaseOrderId;
}

export function toSupplierId(id: string): SupplierId {
  return id as SupplierId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toSupplierPaymentListQuery(
  input: ListSupplierPaymentsInput,
): SupplierPaymentListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    status: input.status,
    supplierId: input.supplierId as SupplierId | undefined,
    purchaseOrderId: input.purchaseOrderId as PurchaseOrderId | undefined,
  };
}
