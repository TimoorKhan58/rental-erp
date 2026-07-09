import { Payment } from "@/modules/payment/domain/payment.entity";
import type { CreatePaymentData } from "@/modules/payment/domain/payment.types";
import {
  CUSTOMER_ID,
  OTHER_CUSTOMER_ID,
  RENTAL_INVOICE_ID,
  USER_ID,
} from "@/modules/rental-invoice/tests/helpers/rental-invoice.fixtures";
import type { PaymentId } from "@/shared/domain/ids";

export { CUSTOMER_ID, OTHER_CUSTOMER_ID, RENTAL_INVOICE_ID, USER_ID };

export const PAYMENT_ID =
  "dd0e8400-e29b-41d4-a716-446655440000" as PaymentId;

export const OTHER_PAYMENT_ID =
  "dd0e8400-e29b-41d4-a716-446655440001" as PaymentId;

export const VALID_CREATE_INPUT = {
  paymentNumber: "PAY-2026-001",
  rentalInvoiceId: RENTAL_INVOICE_ID,
  customerId: CUSTOMER_ID,
  paymentDate: "2026-02-20T00:00:00.000Z",
  paymentMethod: "BANK_TRANSFER" as const,
  amount: 100,
  referenceNumber: "REF-001",
  notes: "Partial payment for invoice",
};

export function buildCreatePaymentData(
  override: Partial<CreatePaymentData> = {},
): CreatePaymentData {
  return {
    paymentNumber: VALID_CREATE_INPUT.paymentNumber,
    rentalInvoiceId: RENTAL_INVOICE_ID,
    customerId: CUSTOMER_ID,
    paymentDate: new Date(VALID_CREATE_INPUT.paymentDate),
    paymentMethod: VALID_CREATE_INPUT.paymentMethod,
    amount: VALID_CREATE_INPUT.amount,
    referenceNumber: VALID_CREATE_INPUT.referenceNumber,
    notes: VALID_CREATE_INPUT.notes,
    createdById: USER_ID,
    ...override,
  };
}

export function buildPaymentEntity(
  override: {
    id?: PaymentId;
    status?: Payment["status"];
    amount?: number;
    paymentMethod?: Payment["paymentMethod"];
    referenceNumber?: string | null;
    notes?: string | null;
    postedAt?: Date | null;
    voidedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Payment {
  const created = Payment.create(buildCreatePaymentData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Payment.reconstitute({
    id: override.id ?? PAYMENT_ID,
    paymentNumber: created.paymentNumber,
    rentalInvoiceId: created.rentalInvoiceId,
    customerId: created.customerId,
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

export function buildPostedPaymentEntity(): Payment {
  const pending = buildPaymentEntity();
  const posted = pending.withPosted();

  return Payment.reconstitute({
    ...posted.toProps(),
    postedAt: new Date("2026-01-18T10:00:00.000Z"),
    updatedAt: new Date("2026-01-18T10:00:00.000Z"),
  });
}

export function buildVoidPaymentEntity(fromPosted = false): Payment {
  const source = fromPosted ? buildPostedPaymentEntity() : buildPaymentEntity();
  const voided = source.withVoided();

  return Payment.reconstitute({
    ...voided.toProps(),
    voidedAt: new Date("2026-01-20T10:00:00.000Z"),
    updatedAt: new Date("2026-01-20T10:00:00.000Z"),
  });
}
