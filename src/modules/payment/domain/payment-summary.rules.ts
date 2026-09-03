import { PAYMENT_METHODS, PAYMENT_SEARCH_FIELDS, PAYMENT_STATUSES } from "./payment.constants";
import type { Payment } from "./payment.entity";
import type { PaymentSummaryQuery } from "./payment-summary.query";
import type {
  PaymentSummaryMethodCounts,
  PaymentSummaryProjection,
  PaymentSummaryResult,
  PaymentSummaryStats,
  PaymentSummaryStatusCounts,
} from "./payment-summary.types";

export function matchesPaymentSummaryQuery(
  payment: Pick<
    Payment,
    | "status"
    | "customerId"
    | "rentalInvoiceId"
    | "paymentMethod"
    | "paymentDate"
    | "paymentNumber"
    | "referenceNumber"
    | "notes"
  >,
  query: PaymentSummaryQuery,
): boolean {
  if (query.status !== undefined && payment.status !== query.status) {
    return false;
  }

  if (query.paymentMethod !== undefined && payment.paymentMethod !== query.paymentMethod) {
    return false;
  }

  if (query.customerId !== undefined && payment.customerId !== query.customerId) {
    return false;
  }

  if (
    query.rentalInvoiceId !== undefined &&
    payment.rentalInvoiceId !== query.rentalInvoiceId
  ) {
    return false;
  }

  if (query.paymentDateFrom !== undefined) {
    if (payment.paymentDate.getTime() < query.paymentDateFrom.getTime()) {
      return false;
    }
  }

  if (query.paymentDateTo !== undefined) {
    const end = new Date(query.paymentDateTo);
    end.setHours(23, 59, 59, 999);

    if (payment.paymentDate.getTime() > end.getTime()) {
      return false;
    }
  }

  if (query.search !== undefined) {
    const term = query.search.toLowerCase();
    const matchesSearch = PAYMENT_SEARCH_FIELDS.some((field) => {
      const value = payment[field as keyof typeof payment];
      return typeof value === "string" && value.toLowerCase().includes(term);
    });

    if (!matchesSearch) {
      return false;
    }
  }

  return true;
}

export function filterPaymentsForSummary(
  payments: Payment[],
  query: PaymentSummaryQuery,
): Payment[] {
  return payments.filter((payment) => matchesPaymentSummaryQuery(payment, query));
}

export function computePaymentSummaryResult(
  payments: PaymentSummaryProjection[],
): PaymentSummaryResult {
  let pendingCount = 0;
  let postedCount = 0;
  let voidCount = 0;
  let totalCollected = 0;
  let totalPendingAmount = 0;

  const statusCounts = Object.fromEntries(
    PAYMENT_STATUSES.map((status) => [status, 0]),
  ) as Omit<PaymentSummaryStatusCounts, "all">;

  const methodCounts = Object.fromEntries(
    PAYMENT_METHODS.map((method) => [method, 0]),
  ) as Omit<PaymentSummaryMethodCounts, "all">;

  for (const payment of payments) {
    statusCounts[payment.status] += 1;
    methodCounts[payment.paymentMethod] += 1;

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

  const stats: PaymentSummaryStats = {
    totalPayments: payments.length,
    activePayments: payments.length - voidCount,
    pendingCount,
    postedCount,
    voidCount,
    totalCollected,
    totalPendingAmount,
  };

  return {
    stats,
    statusCounts: {
      all: payments.length,
      ...statusCounts,
    },
    methodCounts: {
      all: payments.length,
      ...methodCounts,
    },
  };
}
