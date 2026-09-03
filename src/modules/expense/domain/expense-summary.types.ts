import type { ExpenseStatus } from "./expense.constants";

export interface ExpenseSummaryStats {
  totalExpenses: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
}

export type ExpenseSummaryStatusCounts = Record<"all" | ExpenseStatus, number>;

export interface ExpenseSummaryResult {
  stats: ExpenseSummaryStats;
  statusCounts: ExpenseSummaryStatusCounts;
}

export type ExpenseSummaryProjection = {
  status: ExpenseStatus;
  amount: number;
};
