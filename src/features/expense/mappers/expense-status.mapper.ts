import type { ExpenseStatus } from "../types";
import type { ExpensePaymentMethod, ExpenseType } from "../types";

export function canEditExpense(status: ExpenseStatus): boolean {
  return status === "DRAFT";
}

export function canSubmitExpense(status: ExpenseStatus): boolean {
  return status === "DRAFT";
}

export function canApproveExpense(status: ExpenseStatus): boolean {
  return status === "SUBMITTED";
}

export function canRejectExpense(status: ExpenseStatus): boolean {
  return status === "SUBMITTED";
}

export function canPayExpense(status: ExpenseStatus): boolean {
  return status === "APPROVED";
}

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

export const TYPE_LABELS: Record<ExpenseType, string> = {
  VENDOR: "Vendor",
  MANUAL: "Manual",
};

export const METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  CARD: "Card",
  ONLINE: "Online",
  OTHER: "Other",
};
