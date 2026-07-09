import { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";
import type { CreateJournalEntryData } from "@/modules/accounting/domain/journal-entry.types";
import type { JournalEntryId } from "@/shared/domain/ids";

import {
  ACCOUNT_ID,
  CASH_ACCOUNT_ID,
  USER_ID,
} from "./account.fixtures";

export { ACCOUNT_ID, CASH_ACCOUNT_ID, OTHER_ACCOUNT_ID, USER_ID } from "./account.fixtures";

export const JOURNAL_ENTRY_ID =
  "cc0e8400-e29b-41d4-a716-446655440000" as JournalEntryId;

export const OTHER_JOURNAL_ENTRY_ID =
  "cc0e8400-e29b-41d4-a716-446655440001" as JournalEntryId;

export const VALID_CREATE_JOURNAL_INPUT = {
  journalNumber: "JE-2026-001",
  journalDate: "2026-02-20T00:00:00.000Z",
  description: "Opening balance entry",
  referenceType: "MANUAL" as const,
  referenceId: null,
  lines: [
    {
      accountId: ACCOUNT_ID,
      debit: 500,
      credit: 0,
      memo: "Debit cash",
      sortOrder: 0,
    },
    {
      accountId: CASH_ACCOUNT_ID,
      debit: 0,
      credit: 500,
      memo: "Credit equity",
      sortOrder: 1,
    },
  ],
};

export function buildCreateJournalEntryData(
  override: Partial<CreateJournalEntryData> = {},
): CreateJournalEntryData {
  return {
    journalNumber: VALID_CREATE_JOURNAL_INPUT.journalNumber,
    journalDate: new Date(VALID_CREATE_JOURNAL_INPUT.journalDate),
    description: VALID_CREATE_JOURNAL_INPUT.description,
    referenceType: VALID_CREATE_JOURNAL_INPUT.referenceType,
    referenceId: VALID_CREATE_JOURNAL_INPUT.referenceId,
    lines: VALID_CREATE_JOURNAL_INPUT.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo,
      sortOrder: line.sortOrder,
    })),
    createdById: USER_ID,
    ...override,
  };
}

export function buildJournalEntryEntity(
  override: {
    id?: JournalEntryId;
    status?: JournalEntry["status"];
    journalNumber?: string;
    description?: string;
    postedAt?: Date | null;
    voidedAt?: Date | null;
    postedById?: JournalEntry["postedById"];
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): JournalEntry {
  const created = JournalEntry.create(buildCreateJournalEntryData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return JournalEntry.reconstitute({
    id: override.id ?? JOURNAL_ENTRY_ID,
    journalNumber: override.journalNumber ?? created.journalNumber,
    journalDate: created.journalDate,
    description: override.description ?? created.description,
    referenceType: created.referenceType,
    referenceId: created.referenceId,
    status: override.status ?? "DRAFT",
    postedAt: override.postedAt ?? null,
    voidedAt: override.voidedAt ?? null,
    createdById: created.createdById,
    postedById: override.postedById ?? null,
    lines: created.lines.map((line, index) => ({
      ...line,
      id: `line-${index + 1}`,
    })),
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}

export function buildPostedJournalEntryEntity(): JournalEntry {
  const draft = buildJournalEntryEntity();
  const posted = draft.withPosted(USER_ID);

  return JournalEntry.reconstitute({
    ...posted.toProps(),
    lines: posted.lines.map((line, index) => ({
      ...line,
      id: `line-${index + 1}`,
    })),
    postedAt: new Date("2026-01-18T10:00:00.000Z"),
    updatedAt: new Date("2026-01-18T10:00:00.000Z"),
  });
}

export function buildVoidJournalEntryEntity(fromPosted = false): JournalEntry {
  const source = fromPosted
    ? buildPostedJournalEntryEntity()
    : buildJournalEntryEntity();
  const voided = source.withVoided();

  return JournalEntry.reconstitute({
    ...voided.toProps(),
    voidedAt: new Date("2026-01-20T10:00:00.000Z"),
    updatedAt: new Date("2026-01-20T10:00:00.000Z"),
  });
}
