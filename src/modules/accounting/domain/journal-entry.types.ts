import type {
  AccountId,
  JournalEntryId,
  UserId,
} from "@/shared/domain/ids";

import type {
  JournalEntryStatus,
  JournalReferenceType,
} from "./journal-entry.constants";

export interface JournalLineProps {
  id: string;
  accountId: AccountId;
  debit: number;
  credit: number;
  memo: string | null;
  sortOrder: number;
}

export interface CreateJournalLineData {
  accountId: AccountId;
  debit: number;
  credit: number;
  memo?: string | null;
  sortOrder?: number;
}

export interface CreateJournalEntryData {
  journalNumber: string;
  journalDate: Date;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  lines: CreateJournalLineData[];
  createdById: UserId;
}

export interface UpdateJournalEntryData {
  journalDate?: Date;
  description?: string;
  referenceType?: JournalReferenceType | null;
  referenceId?: string | null;
  lines?: CreateJournalLineData[];
}

export interface UpdateJournalEntryStatusData {
  status: JournalEntryStatus;
  postedAt?: Date | null;
  voidedAt?: Date | null;
  postedById?: UserId | null;
}

export interface JournalEntryProps {
  id: JournalEntryId;
  journalNumber: string;
  journalDate: Date;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  status: JournalEntryStatus;
  postedAt: Date | null;
  voidedAt: Date | null;
  createdById: UserId;
  postedById: UserId | null;
  lines: JournalLineProps[];
  createdAt: Date;
  updatedAt: Date;
}
