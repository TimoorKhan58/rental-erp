/** Pure booking-advance rules. Monetary amounts are in PKR rounded to paisa. */
export type AdvanceStatus = "PENDING" | "POSTED" | "VOID";

export interface AdvanceBalance {
  amount: number;
  appliedAmount: number;
  refundedAmount: number;
  status: AdvanceStatus;
}

function cents(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Advance monetary amounts must be finite and nonnegative");
  }
  const rounded = Math.round(value * 100);
  if (Math.abs(value * 100 - rounded) > 0.000001) {
    throw new Error("Advance monetary amounts must have at most two decimal places");
  }
  return rounded;
}

export function assertAdvanceBalance(advance: AdvanceBalance): void {
  const amount = cents(advance.amount);
  const applied = cents(advance.appliedAmount);
  const refunded = cents(advance.refundedAmount);
  if (amount === 0 || applied + refunded > amount) {
    throw new Error("Advance settlement exceeds the received amount");
  }
  if (advance.status !== "POSTED" && (applied !== 0 || refunded !== 0)) {
    throw new Error("Only posted advances may be settled");
  }
}

export function availableAdvanceAmount(advance: AdvanceBalance): number {
  assertAdvanceBalance(advance);
  if (advance.status !== "POSTED") return 0;
  return (cents(advance.amount) - cents(advance.appliedAmount) - cents(advance.refundedAmount)) / 100;
}

export function allocateAdvanceToInvoice(
  advance: AdvanceBalance,
  invoiceOutstanding: number,
): number {
  const outstanding = cents(invoiceOutstanding);
  return Math.min(cents(availableAdvanceAmount(advance)), outstanding) / 100;
}

export function assertAdvanceOrderAndCustomer(
  advanceOrderId: string,
  advanceCustomerId: string,
  invoiceOrderId: string,
  invoiceCustomerId: string,
): void {
  if (advanceOrderId !== invoiceOrderId || advanceCustomerId !== invoiceCustomerId) {
    throw new Error("Advance and invoice must belong to the same rental order and customer");
  }
}
