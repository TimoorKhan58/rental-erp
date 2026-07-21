import type { PaymentMethod, PaymentResponse, PaymentStatus } from "../types";

export type PaymentSummaryStats = {
  totalPayments: number;
  activePayments: number;
  pendingCount: number;
  postedCount: number;
  voidCount: number;
  totalCollected: number;
  totalPendingAmount: number;
};

export function computePaymentSummary(payments: PaymentResponse[]): PaymentSummaryStats {
  let pendingCount = 0;
  let postedCount = 0;
  let voidCount = 0;
  let totalCollected = 0;
  let totalPendingAmount = 0;

  for (const payment of payments) {
    switch (payment.status) {
      case "PENDING":
        pendingCount += 1;
        totalPendingAmount += payment.amount;
        break;
      case "POSTED":
        postedCount += 1;
        totalCollected += payment.amount;
        break;
      case "VOID":
        voidCount += 1;
        break;
    }
  }

  return {
    totalPayments: payments.length,
    activePayments: payments.length - voidCount,
    pendingCount,
    postedCount,
    voidCount,
    totalCollected,
    totalPendingAmount,
  };
}

export function computePaymentStatusCounts(
  payments: PaymentResponse[],
): Partial<Record<"all" | PaymentStatus, number>> {
  const counts: Partial<Record<"all" | PaymentStatus, number>> = {
    all: payments.length,
    PENDING: 0,
    POSTED: 0,
    VOID: 0,
  };

  for (const payment of payments) {
    counts[payment.status] = (counts[payment.status] ?? 0) + 1;
  }

  return counts;
}

export function computePaymentMethodCounts(
  payments: PaymentResponse[],
): Partial<Record<"all" | PaymentMethod, number>> {
  const counts: Partial<Record<"all" | PaymentMethod, number>> = {
    all: payments.length,
    CASH: 0,
    BANK_TRANSFER: 0,
    CHEQUE: 0,
    CARD: 0,
    ONLINE: 0,
    OTHER: 0,
  };

  for (const payment of payments) {
    counts[payment.paymentMethod] = (counts[payment.paymentMethod] ?? 0) + 1;
  }

  return counts;
}

const WORKFLOW_STEPS: PaymentStatus[] = ["PENDING", "POSTED"];

export function getPaymentWorkflowStep(status: PaymentStatus): number {
  if (status === "VOID") {
    return -1;
  }

  return WORKFLOW_STEPS.indexOf(status);
}

export function getPaymentWorkflowProgress(status: PaymentStatus): number {
  const step = getPaymentWorkflowStep(status);

  if (step < 0) {
    return 0;
  }

  return Math.round(((step + 1) / WORKFLOW_STEPS.length) * 100);
}
