import type { PaymentMethod, PaymentResponse } from "../types";

export function matchesPaymentDateRange(
  paymentDate: string,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) {
    return true;
  }

  const date = paymentDate.slice(0, 10);

  if (from && date < from) {
    return false;
  }

  if (to && date > to) {
    return false;
  }

  return true;
}

export function matchesPaymentMethodFilter(
  payment: PaymentResponse,
  method?: PaymentMethod,
): boolean {
  if (!method) {
    return true;
  }

  return payment.paymentMethod === method;
}
