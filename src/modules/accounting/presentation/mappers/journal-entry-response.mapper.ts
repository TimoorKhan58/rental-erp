import type { JournalEntryDto } from "@/modules/accounting/application/dtos/journal-entry.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface JournalLineResponse {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  memo: string | null;
  sortOrder: number;
}

export interface JournalEntryResponse {
  id: string;
  journalNumber: string;
  journalDate: string;
  description: string;
  referenceType: JournalEntryDto["referenceType"];
  referenceId: string | null;
  status: JournalEntryDto["status"];
  postedAt: string | null;
  voidedAt: string | null;
  createdById: string;
  postedById: string | null;
  lines: JournalLineResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryListResponse {
  items: JournalEntryResponse[];
  meta: PaginationMeta;
}

export function toJournalEntryResponse(
  dto: JournalEntryDto,
): JournalEntryResponse {
  return {
    id: dto.id,
    journalNumber: dto.journalNumber,
    journalDate: dto.journalDate,
    description: dto.description,
    referenceType: dto.referenceType,
    referenceId: dto.referenceId,
    status: dto.status,
    postedAt: dto.postedAt,
    voidedAt: dto.voidedAt,
    createdById: dto.createdById,
    postedById: dto.postedById,
    lines: dto.lines.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo,
      sortOrder: line.sortOrder,
    })),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toJournalEntryListResponse(
  result: PaginatedResult<JournalEntryDto>,
): JournalEntryListResponse {
  return {
    items: result.items.map(toJournalEntryResponse),
    meta: result.meta,
  };
}
