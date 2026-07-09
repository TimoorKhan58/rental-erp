import type { JournalEntryId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { JournalEntry } from "./journal-entry.entity";
import type { JournalEntryListQuery } from "./journal-entry-list.query";
import type {
  CreateJournalEntryData,
  UpdateJournalEntryData,
  UpdateJournalEntryStatusData,
} from "./journal-entry.types";

export interface IJournalEntryRepository {
  findById(id: JournalEntryId): Promise<JournalEntry | null>;
  findByJournalNumber(journalNumber: string): Promise<JournalEntry | null>;
  findPaged(
    query: JournalEntryListQuery,
  ): Promise<PaginatedResult<JournalEntry>>;
  create(data: CreateJournalEntryData): Promise<JournalEntry>;
  update(
    id: JournalEntryId,
    data: UpdateJournalEntryData,
  ): Promise<JournalEntry>;
  updateStatus(
    id: JournalEntryId,
    data: UpdateJournalEntryStatusData,
  ): Promise<JournalEntry>;
}
