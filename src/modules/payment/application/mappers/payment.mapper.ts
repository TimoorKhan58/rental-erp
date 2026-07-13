import type { Payment } from "@/modules/payment/domain/payment.entity";
import type { PaymentListQuery } from "@/modules/payment/domain/payment-list.query";
import type {
  CreatePaymentData,
  UpdatePaymentData,
} from "@/modules/payment/domain/payment.types";
import type {
  CustomerId,
  PaymentId,
  RentalInvoiceId,
  UserId,
} from "@/shared/domain/ids";

import type { PaymentDto } from "../dtos/payment.dto";
import type {
  CreatePaymentInput,
  UpdatePaymentInput,
} from "../schemas/payment.schemas";
import type { ListPaymentsInput } from "../schemas/list-payments.schema";

export function toPaymentDto(payment: Payment): PaymentDto {
  const props = payment.toProps();

  return {
    id: props.id,
    paymentNumber: props.paymentNumber,
    rentalInvoiceId: props.rentalInvoiceId,
    customerId: props.customerId,
    paymentDate: props.paymentDate.toISOString(),
    paymentMethod: props.paymentMethod,
    amount: props.amount,
    isRefund: props.isRefund,
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

export function toCreatePaymentData(
  input: CreatePaymentInput,
  createdById: UserId,
): CreatePaymentData {
  return {
    paymentNumber: input.paymentNumber,
    rentalInvoiceId: input.rentalInvoiceId as RentalInvoiceId,
    customerId: input.customerId as CustomerId,
    paymentDate: input.paymentDate,
    paymentMethod: input.paymentMethod,
    amount: input.amount,
    isRefund: input.isRefund === true,
    referenceNumber: input.referenceNumber ?? null,
    notes: input.notes ?? null,
    createdById,
  };
}

export function toUpdatePaymentData(input: UpdatePaymentInput): UpdatePaymentData {
  return {
    paymentDate: input.paymentDate,
    paymentMethod: input.paymentMethod,
    amount: input.amount,
    referenceNumber: input.referenceNumber,
    notes: input.notes,
  };
}

export function toPaymentId(id: string): PaymentId {
  return id as PaymentId;
}

export function toRentalInvoiceId(id: string): RentalInvoiceId {
  return id as RentalInvoiceId;
}

export function toCustomerId(id: string): CustomerId {
  return id as CustomerId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toPaymentListQuery(input: ListPaymentsInput): PaymentListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    status: input.status,
    customerId: input.customerId as CustomerId | undefined,
    rentalInvoiceId: input.rentalInvoiceId as RentalInvoiceId | undefined,
  };
}
