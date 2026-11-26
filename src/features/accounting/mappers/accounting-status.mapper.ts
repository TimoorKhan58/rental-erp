import type { AccountType, JournalEntryStatus, JournalReferenceType } from "../types";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: "What you own",
  LIABILITY: "What you owe",
  EQUITY: "Your share",
  INCOME: "Income",
  EXPENSE: "Cost",
};

export const JOURNAL_STATUS_LABELS: Record<JournalEntryStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  VOID: "Void",
};

export const REFERENCE_TYPE_LABELS: Record<JournalReferenceType, string> = {
  RENTAL_INVOICE: "Invoice",
  PAYMENT: "Customer payment",
  MANUAL: "Entered by hand",
  OTHER: "Expense / other",
  PURCHASE_ORDER: "Purchase",
  SUPPLIER_PAYMENT: "Supplier payment",
  EXTERNAL_RENTAL: "Hire-in",
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
