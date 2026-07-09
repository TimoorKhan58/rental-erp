import type { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";
import type { JournalEntryListQuery } from "@/modules/accounting/domain/journal-entry-list.query";
import type {
  CreateJournalEntryData,
  CreateJournalLineData,
  UpdateJournalEntryData,
} from "@/modules/accounting/domain/journal-entry.types";
import type {
  AccountId,
  JournalEntryId,
  UserId,
} from "@/shared/domain/ids";

import type { JournalEntryDto } from "../dtos/journal-entry.dto";
import type {
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from "../schemas/journal-entry.schemas";
import type { ListJournalEntriesInput } from "../schemas/list-journal-entries.schema";

export function toJournalEntryDto(entry: JournalEntry): JournalEntryDto {
  const props = entry.toProps();

  return {
    id: props.id,
    journalNumber: props.journalNumber,
    journalDate: props.journalDate.toISOString(),
    description: props.description,
    referenceType: props.referenceType,
    referenceId: props.referenceId,
    status: props.status,
    postedAt: props.postedAt?.toISOString() ?? null,
    voidedAt: props.voidedAt?.toISOString() ?? null,
    createdById: props.createdById,
    postedById: props.postedById,
    lines: props.lines.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo,
      sortOrder: line.sortOrder,
    })),
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateJournalEntryData(
  input: CreateJournalEntryInput,
  createdById: UserId,
): CreateJournalEntryData {
  return {
    journalNumber: input.journalNumber,
    journalDate: input.journalDate,
    description: input.description,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    lines: input.lines.map(toCreateJournalLineData),
    createdById,
  };
}

export function toUpdateJournalEntryData(
  input: UpdateJournalEntryInput,
): UpdateJournalEntryData {
  return {
    journalDate: input.journalDate,
    description: input.description,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    lines: input.lines?.map(toCreateJournalLineData),
  };
}

function toCreateJournalLineData(
  line: CreateJournalEntryInput["lines"][number],
): CreateJournalLineData {
  return {
    accountId: line.accountId as AccountId,
    debit: line.debit,
    credit: line.credit,
    memo: line.memo ?? null,
    sortOrder: line.sortOrder,
  };
}

export function toJournalEntryId(id: string): JournalEntryId {
  return id as JournalEntryId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toJournalEntryListQuery(
  input: ListJournalEntriesInput,
): JournalEntryListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    status: input.status,
    referenceType: input.referenceType,
    journalDateFrom: input.journalDateFrom,
    journalDateTo: input.journalDateTo,
  };
}
