import type { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";

export function toJournalEntryAuditValues(
  entry: JournalEntry,
): Record<string, unknown> {
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
  };
}
