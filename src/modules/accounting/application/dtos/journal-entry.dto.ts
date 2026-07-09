import type {
  JournalEntryStatus,
  JournalReferenceType,
} from "@/modules/accounting/domain/journal-entry.constants";

export interface JournalLineDto {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  memo: string | null;
  sortOrder: number;
}

export interface JournalEntryDto {
  id: string;
  journalNumber: string;
  journalDate: string;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  status: JournalEntryStatus;
  postedAt: string | null;
  voidedAt: string | null;
  createdById: string;
  postedById: string | null;
  lines: JournalLineDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateJournalLineDto {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string | null;
  sortOrder?: number;
}

export interface CreateJournalEntryDto {
  journalNumber: string;
  journalDate: string;
  description: string;
  referenceType?: JournalReferenceType | null;
  referenceId?: string | null;
  lines: CreateJournalLineDto[];
}

export interface UpdateJournalEntryDto {
  journalDate?: string;
  description?: string;
  referenceType?: JournalReferenceType | null;
  referenceId?: string | null;
  lines?: CreateJournalLineDto[];
}
