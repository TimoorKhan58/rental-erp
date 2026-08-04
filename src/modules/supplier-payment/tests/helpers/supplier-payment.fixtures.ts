import { SupplierPayment } from "@/modules/supplier-payment/domain/supplier-payment.entity";
import type { CreateSupplierPaymentData } from "@/modules/supplier-payment/domain/supplier-payment.types";
import {
  PURCHASE_ORDER_ID,
  SUPPLIER_ID,
  USER_ID,
} from "@/modules/procurement/tests/helpers/purchase-order.fixtures";
import type { SupplierPaymentId } from "@/shared/domain/ids";

export { PURCHASE_ORDER_ID, SUPPLIER_ID, USER_ID };

export const OTHER_SUPPLIER_ID =
  "660e8400-e29b-41d4-a716-446655440099" as typeof SUPPLIER_ID;

export const SUPPLIER_PAYMENT_ID =
  "ee0e8400-e29b-41d4-a716-446655440000" as SupplierPaymentId;

export const OTHER_SUPPLIER_PAYMENT_ID =
  "ee0e8400-e29b-41d4-a716-446655440001" as SupplierPaymentId;

export const VALID_CREATE_INPUT = {
  paymentNumber: "SPAY-2026-001",
  purchaseOrderId: PURCHASE_ORDER_ID,
  supplierId: SUPPLIER_ID,
  paymentDate: "2026-02-20T00:00:00.000Z",
  paymentMethod: "BANK_TRANSFER" as const,
  amount: 500,
  referenceNumber: "REF-SP-001",
  notes: "Supplier payment for PO",
};

export function buildCreateSupplierPaymentData(
  override: Partial<CreateSupplierPaymentData> = {},
): CreateSupplierPaymentData {
  return {
    paymentNumber: VALID_CREATE_INPUT.paymentNumber,
    purchaseOrderId: PURCHASE_ORDER_ID,
    supplierId: SUPPLIER_ID,
    paymentDate: new Date(VALID_CREATE_INPUT.paymentDate),
    paymentMethod: VALID_CREATE_INPUT.paymentMethod,
    amount: VALID_CREATE_INPUT.amount,
    referenceNumber: VALID_CREATE_INPUT.referenceNumber,
    notes: VALID_CREATE_INPUT.notes,
    createdById: USER_ID as CreateSupplierPaymentData["createdById"],
    ...override,
  };
}

export function buildSupplierPaymentEntity(
  override: {
    id?: SupplierPaymentId;
    status?: SupplierPayment["status"];
    amount?: number;
    paymentMethod?: SupplierPayment["paymentMethod"];
    referenceNumber?: string | null;
    notes?: string | null;
    postedAt?: Date | null;
    voidedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): SupplierPayment {
  const created = SupplierPayment.create(buildCreateSupplierPaymentData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return SupplierPayment.reconstitute({
    id: override.id ?? SUPPLIER_PAYMENT_ID,
    paymentNumber: created.paymentNumber,
    purchaseOrderId: created.purchaseOrderId,
    supplierId: created.supplierId,
    paymentDate: created.paymentDate,
    paymentMethod: override.paymentMethod ?? created.paymentMethod,
    amount: override.amount ?? created.amount,
    referenceNumber:
      override.referenceNumber !== undefined
        ? override.referenceNumber
        : created.referenceNumber,
    notes: override.notes !== undefined ? override.notes : created.notes,
    status: override.status ?? "PENDING",
    postedAt: override.postedAt ?? null,
    voidedAt: override.voidedAt ?? null,
    createdById: created.createdById,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildPostedSupplierPaymentEntity(): SupplierPayment {
  const pending = buildSupplierPaymentEntity();
  const posted = pending.withPosted();

  return SupplierPayment.reconstitute({
    ...posted.toProps(),
    postedAt: new Date("2026-01-18T10:00:00.000Z"),
    updatedAt: new Date("2026-01-18T10:00:00.000Z"),
  });
}

export function buildVoidSupplierPaymentEntity(
  fromPosted = false,
): SupplierPayment {
  const source = fromPosted
    ? buildPostedSupplierPaymentEntity()
    : buildSupplierPaymentEntity();
  const voided = source.withVoided();

  return SupplierPayment.reconstitute({
    ...voided.toProps(),
    voidedAt: new Date("2026-01-20T10:00:00.000Z"),
    updatedAt: new Date("2026-01-20T10:00:00.000Z"),
  });
}
