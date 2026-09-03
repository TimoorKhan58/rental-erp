import { EXPENSE_SEARCH_FIELDS, EXPENSE_STATUSES } from "./expense.constants";
import type { Expense } from "./expense.entity";
import type { ExpenseSummaryQuery } from "./expense-summary.query";
import type {
  ExpenseSummaryProjection,
  ExpenseSummaryResult,
  ExpenseSummaryStats,
  ExpenseSummaryStatusCounts,
} from "./expense-summary.types";

export function matchesExpenseSummaryQuery(
  expense: Pick<
    Expense,
    | "status"
    | "expenseType"
    | "categoryId"
    | "supplierId"
    | "expenseNumber"
    | "description"
    | "vendorName"
    | "referenceNumber"
    | "notes"
  >,
  query: ExpenseSummaryQuery,
): boolean {
  if (query.status !== undefined && expense.status !== query.status) {
    return false;
  }

  if (query.expenseType !== undefined && expense.expenseType !== query.expenseType) {
    return false;
  }

  if (query.categoryId !== undefined && expense.categoryId !== query.categoryId) {
    return false;
  }

  if (query.supplierId !== undefined && expense.supplierId !== query.supplierId) {
    return false;
  }

  if (query.search !== undefined) {
    const term = query.search.toLowerCase();
    const matchesSearch = EXPENSE_SEARCH_FIELDS.some((field) => {
      const value = expense[field as keyof typeof expense];
      return typeof value === "string" && value.toLowerCase().includes(term);
    });

    if (!matchesSearch) {
      return false;
    }
  }

  return true;
}

export function filterExpensesForSummary(
  expenses: Expense[],
  query: ExpenseSummaryQuery,
): Expense[] {
  return expenses.filter((expense) => matchesExpenseSummaryQuery(expense, query));
}

export function computeExpenseSummaryResult(
  expenses: ExpenseSummaryProjection[],
): ExpenseSummaryResult {
  let draftCount = 0;
  let submittedCount = 0;
  let approvedCount = 0;
  let paidCount = 0;
  let rejectedCount = 0;
  let totalPaidAmount = 0;
  let totalPendingAmount = 0;

  const statusCounts = Object.fromEntries(
    EXPENSE_STATUSES.map((status) => [status, 0]),
  ) as Omit<ExpenseSummaryStatusCounts, "all">;

  for (const expense of expenses) {
    statusCounts[expense.status] += 1;

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

  const stats: ExpenseSummaryStats = {
    totalExpenses: expenses.length,
    draftCount,
    submittedCount,
    approvedCount,
    paidCount,
    rejectedCount,
    totalPaidAmount,
    totalPendingAmount,
  };

  return {
    stats,
    statusCounts: {
      all: expenses.length,
      ...statusCounts,
    },
  };
}
