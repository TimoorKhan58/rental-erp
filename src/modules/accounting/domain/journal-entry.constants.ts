export const JOURNAL_ENTRY_MODULE = "journal-entries";
export const JOURNAL_ENTRY_ENTITY_NAME = "JournalEntry";

export const JOURNAL_ENTRY_STATUSES = ["DRAFT", "POSTED", "VOID"] as const;

export type JournalEntryStatus = (typeof JOURNAL_ENTRY_STATUSES)[number];

export const JOURNAL_REFERENCE_TYPES = [
  "RENTAL_INVOICE",
  "PAYMENT",
  "MANUAL",
  "OTHER",
] as const;

export type JournalReferenceType = (typeof JOURNAL_REFERENCE_TYPES)[number];

export const JOURNAL_ENTRY_SEARCH_FIELDS = [
  "journalNumber",
  "description",
] as const;

export const JOURNAL_ENTRY_SORT_FIELDS = [
  "journalNumber",
  "journalDate",
  "status",
  "createdAt",
] as const;

export type JournalEntrySortField = (typeof JOURNAL_ENTRY_SORT_FIELDS)[number];

export const MIN_JOURNAL_LINES = 2;
