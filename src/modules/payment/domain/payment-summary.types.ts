import type { PaymentMethod, PaymentStatus } from "./payment.constants";

export interface PaymentSummaryStats {
  totalPayments: number;
  activePayments: number;
  pendingCount: number;
  postedCount: number;
  voidCount: number;
  totalCollected: number;
  totalPendingAmount: number;
}

export type PaymentSummaryStatusCounts = Record<"all" | PaymentStatus, number>;

export type PaymentSummaryMethodCounts = Record<"all" | PaymentMethod, number>;

export interface PaymentSummaryResult {
  stats: PaymentSummaryStats;
  statusCounts: PaymentSummaryStatusCounts;
  methodCounts: PaymentSummaryMethodCounts;
}

export interface PaymentSummaryProjection {
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  amount: number;
}
