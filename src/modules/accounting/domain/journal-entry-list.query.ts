import type { JournalEntryStatus, JournalReferenceType } from "./journal-entry.constants";
import type { JournalEntrySortField } from "./journal-entry.constants";

export interface JournalEntryListQuery {
  page: number;
  pageSize: number;
  sortBy?: JournalEntrySortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: JournalEntryStatus;
  referenceType?: JournalReferenceType;
  journalDateFrom?: Date;
  journalDateTo?: Date;
}
