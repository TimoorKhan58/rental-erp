import type { RentalInvoiceStatus } from "@/modules/rental-invoice/domain/rental-invoice.constants";
import { ELIGIBLE_INVOICE_PAYMENT_STATUSES } from "./payment.constants";
import type { PaymentStatus } from "./payment.constants";
import {
  PaymentEligibilityError,
  PaymentInvalidStatusError,
  PaymentInvariantError,
  createPaymentNumber,
} from "./payment.errors";
import type {
  CreatePaymentData,
  PaymentProps,
  UpdatePaymentData,
} from "./payment.types";

export function validatePaymentAmount(amount: number): number {
  if (amount <= 0) {
    throw new PaymentInvariantError(
      "Payment amount must be greater than zero",
      "amount",
    );
  }

  return roundMoney(amount);
}

export function assertPaymentAmountWithinBalance(
  amount: number,
  invoiceBalance: number,
): void {
  if (amount > invoiceBalance) {
    throw new PaymentEligibilityError(
      "Payment amount exceeds invoice balance",
    );
  }
}

export function assertInvoiceEligibleForPayment(
  status: RentalInvoiceStatus,
): void {
  if (status === "VOID") {
    throw new PaymentEligibilityError(
      "Cannot record payment against void invoice",
    );
  }

  if (
    !(ELIGIBLE_INVOICE_PAYMENT_STATUSES as readonly string[]).includes(status)
  ) {
    throw new PaymentEligibilityError(
      `Invoice must be ISSUED or PARTIALLY_PAID to record payment (current: ${status})`,
    );
  }
}

export function assertCustomerMatchesInvoice(
  paymentCustomerId: string,
  invoiceCustomerId: string,
): void {
  if (paymentCustomerId !== invoiceCustomerId) {
    throw new PaymentEligibilityError(
      "Customer does not match invoice customer",
    );
  }
}

export function assertCanUpdate(status: PaymentStatus): void {
  if (status !== "PENDING") {
    throw new PaymentInvalidStatusError(status, "update");
  }
}

export function assertCanPost(status: PaymentStatus): void {
  if (status !== "PENDING") {
    throw new PaymentInvalidStatusError(status, "post");
  }
}

export function assertCanVoid(status: PaymentStatus): void {
  if (status === "VOID") {
    throw new PaymentInvalidStatusError(status, "void");
  }
}

export function assertImmutablePostedPayment(status: PaymentStatus): void {
  if (status === "POSTED") {
    throw new PaymentInvalidStatusError(status, "modify");
  }
}

export function normalizeCreatePaymentData(
  data: CreatePaymentData,
): Omit<PaymentProps, "id" | "status" | "postedAt" | "voidedAt" | "createdAt" | "updatedAt"> {
  return {
    paymentNumber: createPaymentNumber(data.paymentNumber),
    rentalInvoiceId: data.rentalInvoiceId,
    customerId: data.customerId,
    paymentDate: data.paymentDate,
    paymentMethod: data.paymentMethod,
    amount: validatePaymentAmount(data.amount),
    referenceNumber: normalizeOptionalText(data.referenceNumber),
    notes: normalizeOptionalText(data.notes),
    createdById: data.createdById,
  };
}

export function normalizePaymentProps(props: PaymentProps): PaymentProps {
  return {
    ...props,
    paymentNumber: createPaymentNumber(props.paymentNumber),
    amount: validatePaymentAmount(props.amount),
    referenceNumber: normalizeOptionalText(props.referenceNumber),
    notes: normalizeOptionalText(props.notes),
  };
}

export function normalizeUpdatePaymentData(
  data: UpdatePaymentData,
): UpdatePaymentData {
  const normalized: UpdatePaymentData = { ...data };

  if (data.amount !== undefined) {
    normalized.amount = validatePaymentAmount(data.amount);
  }

  if (data.referenceNumber !== undefined) {
    normalized.referenceNumber = normalizeOptionalText(data.referenceNumber);
  }

  if (data.notes !== undefined) {
    normalized.notes = normalizeOptionalText(data.notes);
  }

  return normalized;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
