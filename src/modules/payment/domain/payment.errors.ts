import type { PaymentStatus } from "./payment.constants";

export class PaymentInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "PaymentInvariantError";
  }
}

export class PaymentInvalidStatusError extends Error {
  constructor(
    readonly currentStatus: PaymentStatus,
    readonly action: string,
  ) {
    super(`Cannot ${action} payment in ${currentStatus} status`);
    this.name = "PaymentInvalidStatusError";
  }
}

export class PaymentEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentEligibilityError";
  }
}

export function createPaymentNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new PaymentInvariantError(
      "Payment number is required",
      "paymentNumber",
    );
  }

  return trimmed;
}
