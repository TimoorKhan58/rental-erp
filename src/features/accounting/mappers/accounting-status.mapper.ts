import type { AccountType, JournalEntryStatus, JournalReferenceType } from "../types";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
};

export const JOURNAL_STATUS_LABELS: Record<JournalEntryStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  VOID: "Void",
};

export const REFERENCE_TYPE_LABELS: Record<JournalReferenceType, string> = {
  RENTAL_INVOICE: "Rental invoice",
  PAYMENT: "Payment",
  MANUAL: "Manual",
  OTHER: "Other",
};

export function canEditJournalEntry(status: JournalEntryStatus): boolean {
  return status === "DRAFT";
}

export function canPostJournalEntry(status: JournalEntryStatus): boolean {
  return status === "DRAFT";
}

export function canVoidJournalEntry(status: JournalEntryStatus): boolean {
  return status === "DRAFT" || status === "POSTED";
}

export function canDeleteJournalEntry(status: JournalEntryStatus): boolean {
  return status === "DRAFT";
}
