import type {
  CreatePaymentFormValues,
  UpdatePaymentFormValues,
} from "../schemas";
import type {
  CreatePaymentPayload,
  PaymentResponse,
  UpdatePaymentPayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

export function toCreatePaymentPayload(
  values: CreatePaymentFormValues,
): CreatePaymentPayload {
  return {
    paymentNumber: values.paymentNumber.trim(),
    rentalInvoiceId: values.rentalInvoiceId,
    customerId: values.customerId,
    paymentDate: values.paymentDate,
    paymentMethod: values.paymentMethod,
    amount: values.amount,
    referenceNumber: normalizeOptionalString(values.referenceNumber),
    notes: normalizeOptionalString(values.notes),
  };
}

export function toUpdatePaymentPayload(
  values: UpdatePaymentFormValues,
): UpdatePaymentPayload {
  return {
    paymentDate: values.paymentDate,
    paymentMethod: values.paymentMethod,
    amount: values.amount,
    referenceNumber: normalizeOptionalString(values.referenceNumber),
    notes: normalizeOptionalString(values.notes),
  };
}

export function toPaymentFormValues(payment: PaymentResponse): UpdatePaymentFormValues {
  return {
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    amount: payment.amount,
    referenceNumber: payment.referenceNumber ?? "",
    notes: payment.notes ?? "",
  };
}
