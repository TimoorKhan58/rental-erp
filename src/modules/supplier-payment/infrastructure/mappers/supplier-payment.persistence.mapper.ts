import { Prisma } from "@/generated/prisma/client";
import { SupplierPayment } from "@/modules/supplier-payment/domain/supplier-payment.entity";
import type { PaymentStatus } from "@/modules/supplier-payment/domain/supplier-payment.constants";
import type {
  CreateSupplierPaymentData,
  UpdateSupplierPaymentStatusData,
} from "@/modules/supplier-payment/domain/supplier-payment.types";
import type {
  PurchaseOrderId,
  SupplierId,
  SupplierPaymentId,
  UserId,
} from "@/shared/domain/ids";

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function toSupplierPaymentDomain(record: {
  id: string;
  paymentNumber: string;
  purchaseOrderId: string;
  supplierId: string;
  paymentDate: Date;
  paymentMethod: SupplierPayment["paymentMethod"];
  amount: Prisma.Decimal;
  referenceNumber: string | null;
  notes: string | null;
  status: PaymentStatus;
  postedAt: Date | null;
  voidedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): SupplierPayment {
  return SupplierPayment.reconstitute({
    id: record.id as SupplierPaymentId,
    paymentNumber: record.paymentNumber,
    purchaseOrderId: record.purchaseOrderId as PurchaseOrderId,
    supplierId: record.supplierId as SupplierId,
    paymentDate: record.paymentDate,
    paymentMethod: record.paymentMethod,
    amount: decimalToNumber(record.amount),
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

export function toSupplierPaymentCreateInput(
  data: CreateSupplierPaymentData,
): Prisma.SupplierPaymentCreateInput {
  const normalized = SupplierPayment.create(data);

  return {
    paymentNumber: normalized.paymentNumber,
    purchaseOrder: { connect: { id: normalized.purchaseOrderId } },
    supplier: { connect: { id: normalized.supplierId } },
    paymentDate: normalized.paymentDate,
    paymentMethod: normalized.paymentMethod,
    amount: toPrismaDecimal(normalized.amount),
    referenceNumber: normalized.referenceNumber,
    notes: normalized.notes,
    status: normalized.status,
    createdBy: { connect: { id: normalized.createdById } },
  };
}

export function toSupplierPaymentStatusUpdateInput(
  data: UpdateSupplierPaymentStatusData,
): Prisma.SupplierPaymentUpdateInput {
  const update: Prisma.SupplierPaymentUpdateInput = {
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
