import { Prisma } from "@/generated/prisma/client";
import { Payment } from "@/modules/payment/domain/payment.entity";
import type { PaymentStatus } from "@/modules/payment/domain/payment.constants";
import type {
  CreatePaymentData,
  UpdatePaymentData,
  UpdatePaymentStatusData,
} from "@/modules/payment/domain/payment.types";
import type {
  CustomerId,
  PaymentId,
  RentalInvoiceId,
  UserId,
} from "@/shared/domain/ids";

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function toPaymentDomain(record: {
  id: string;
  paymentNumber: string;
  rentalInvoiceId: string;
  customerId: string;
  paymentDate: Date;
  paymentMethod: Payment["paymentMethod"];
  amount: Prisma.Decimal;
  isRefund?: boolean;
  referenceNumber: string | null;
  notes: string | null;
  status: PaymentStatus;
  postedAt: Date | null;
  voidedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): Payment {
  return Payment.reconstitute({
    id: record.id as PaymentId,
    paymentNumber: record.paymentNumber,
    rentalInvoiceId: record.rentalInvoiceId as RentalInvoiceId,
    customerId: record.customerId as CustomerId,
    paymentDate: record.paymentDate,
    paymentMethod: record.paymentMethod,
    amount: decimalToNumber(record.amount),
    isRefund: record.isRefund === true,
    referenceNumber: record.referenceNumber,
    notes: record.notes,
    status: record.status,
    postedAt: record.postedAt,
    voidedAt: record.voidedAt,
    createdById: record.createdById as UserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toPaymentCreateInput(
  data: CreatePaymentData,
): Prisma.PaymentCreateInput {
  const normalized = Payment.create(data);

  return {
    paymentNumber: normalized.paymentNumber,
    rentalInvoice: { connect: { id: normalized.rentalInvoiceId } },
    customer: { connect: { id: normalized.customerId } },
    paymentDate: normalized.paymentDate,
    paymentMethod: normalized.paymentMethod,
    amount: toPrismaDecimal(normalized.amount),
    isRefund: normalized.isRefund,
    referenceNumber: normalized.referenceNumber,
    notes: normalized.notes,
    status: normalized.status,
    createdBy: { connect: { id: normalized.createdById } },
  };
}

export function toPaymentUpdateInput(
  data: UpdatePaymentData,
  existing: Payment,
): Prisma.PaymentUpdateInput {
  const updated = existing.withUpdated(data);
  const props = updated.toProps();
  const update: Prisma.PaymentUpdateInput = {};

  if (data.paymentDate !== undefined) {
    update.paymentDate = data.paymentDate;
  }

  if (data.paymentMethod !== undefined) {
    update.paymentMethod = data.paymentMethod;
  }

  if (data.amount !== undefined) {
    update.amount = toPrismaDecimal(props.amount);
  }

  if (data.referenceNumber !== undefined) {
    update.referenceNumber = data.referenceNumber;
  }

  if (data.notes !== undefined) {
    update.notes = data.notes;
  }

  return update;
}

export function toPaymentStatusUpdateInput(
  data: UpdatePaymentStatusData,
): Prisma.PaymentUpdateInput {
  const update: Prisma.PaymentUpdateInput = {
    status: data.status,
  };

  if (data.postedAt !== undefined) {
    update.postedAt = data.postedAt;
  }

  if (data.voidedAt !== undefined) {
    update.voidedAt = data.voidedAt;
  }

  return update;
}
