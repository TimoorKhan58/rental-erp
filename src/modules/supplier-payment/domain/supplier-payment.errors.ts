import type { PaymentStatus } from "./supplier-payment.constants";

export class SupplierPaymentInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "SupplierPaymentInvariantError";
  }
}

export class SupplierPaymentInvalidStatusError extends Error {
  constructor(
    readonly currentStatus: PaymentStatus,
    readonly action: string,
  ) {
    super(`Cannot ${action} supplier payment in ${currentStatus} status`);
    this.name = "SupplierPaymentInvalidStatusError";
  }
}

export class SupplierPaymentEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupplierPaymentEligibilityError";
  }
}

export function createSupplierPaymentNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new SupplierPaymentInvariantError(
      "Payment number is required",
      "paymentNumber",
    );
  }

  return trimmed;
}
