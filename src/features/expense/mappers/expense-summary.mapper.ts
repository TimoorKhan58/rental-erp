import type { ExpenseResponse, ExpenseStatus } from "../types";

export type ExpenseSummaryStats = {
  totalExpenses: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
};

export function computeExpenseSummary(
  expenses: ExpenseResponse[],
): ExpenseSummaryStats {
  let draftCount = 0;
  let submittedCount = 0;
  let approvedCount = 0;
  let paidCount = 0;
  let rejectedCount = 0;
  let totalPaidAmount = 0;
  let totalPendingAmount = 0;

  for (const expense of expenses) {
    switch (expense.status) {
      case "DRAFT":
        draftCount += 1;
        totalPendingAmount += expense.amount;
        break;
      case "SUBMITTED":
        submittedCount += 1;
        totalPendingAmount += expense.amount;
        break;
      case "APPROVED":
        approvedCount += 1;
        totalPendingAmount += expense.amount;
        break;
      case "PAID":
        paidCount += 1;
        totalPaidAmount += expense.amount;
        break;
      case "REJECTED":
        rejectedCount += 1;
        break;
    }
  }

  return {
    totalExpenses: expenses.length,
    draftCount,
    submittedCount,
    approvedCount,
    paidCount,
    rejectedCount,
    totalPaidAmount,
    totalPendingAmount,
  };
}

export function computeExpenseStatusCounts(
  expenses: ExpenseResponse[],
): Partial<Record<"all" | ExpenseStatus, number>> {
  const counts: Partial<Record<"all" | ExpenseStatus, number>> = {
    all: expenses.length,
    DRAFT: 0,
    SUBMITTED: 0,
    APPROVED: 0,
    REJECTED: 0,
    PAID: 0,
  };

  for (const expense of expenses) {
    counts[expense.status] = (counts[expense.status] ?? 0) + 1;
  }

  return counts;
}

const WORKFLOW_STEPS: ExpenseStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "PAID",
];

export function getExpenseWorkflowStep(status: ExpenseStatus): number {
  if (status === "REJECTED") {
    return -1;
  }

  return WORKFLOW_STEPS.indexOf(status);
}

export function getExpenseWorkflowProgress(status: ExpenseStatus): number {
  const step = getExpenseWorkflowStep(status);

  if (step < 0) {
    return 0;
  }

  return Math.round(((step + 1) / WORKFLOW_STEPS.length) * 100);
}
