import type { JournalEntryStatus } from "./journal-entry.constants";
import { MIN_JOURNAL_LINES } from "./journal-entry.constants";
import {
  JournalEntryInvalidStatusError,
  JournalEntryInvariantError,
  createJournalDescription,
  createJournalNumber,
} from "./journal-entry.errors";
import { JournalLine } from "./journal-line.entity";
import type {
  CreateJournalEntryData,
  CreateJournalLineData,
  JournalEntryProps,
  JournalLineProps,
  UpdateJournalEntryData,
} from "./journal-entry.types";

export function validateJournalLines(
  lines: CreateJournalLineData[],
): JournalLineProps[] {
  if (lines.length < MIN_JOURNAL_LINES) {
    throw new JournalEntryInvariantError(
      `Journal entry must have at least ${MIN_JOURNAL_LINES} lines`,
      "lines",
    );
  }

  return lines.map((line, index) => {
    try {
      return JournalLine.create({
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo ?? null,
        sortOrder: line.sortOrder ?? index,
      });
    } catch (error) {
      if (error instanceof JournalEntryInvariantError) {
        throw new JournalEntryInvariantError(
          error.message,
          error.field ? `lines[${index}].${error.field}` : `lines[${index}]`,
        );
      }

      throw error;
    }
  });
}

export function assertJournalEntryBalanced(lines: JournalLineProps[]): void {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += line.debit;
    totalCredit += line.credit;
  }

  const roundedDebit = roundMoney(totalDebit);
  const roundedCredit = roundMoney(totalCredit);

  if (roundedDebit <= 0 || roundedCredit <= 0) {
    throw new JournalEntryInvariantError(
      "Journal entry must have positive total debits and credits",
      "lines",
    );
  }

  if (roundedDebit !== roundedCredit) {
    throw new JournalEntryInvariantError(
      `Journal entry is not balanced (debits: ${roundedDebit}, credits: ${roundedCredit})`,
      "lines",
    );
  }
}

export function assertCanUpdate(status: JournalEntryStatus): void {
  if (status !== "DRAFT") {
    throw new JournalEntryInvalidStatusError(status, "update");
  }
}

export function assertCanPost(status: JournalEntryStatus): void {
  if (status !== "DRAFT") {
    throw new JournalEntryInvalidStatusError(status, "post");
  }
}

export function assertCanVoid(status: JournalEntryStatus): void {
  if (status === "VOID") {
    throw new JournalEntryInvalidStatusError(status, "void");
  }
}

export function assertImmutablePostedJournal(status: JournalEntryStatus): void {
  if (status === "POSTED") {
    throw new JournalEntryInvalidStatusError(status, "modify");
  }
}

export function normalizeCreateJournalEntryData(
  data: CreateJournalEntryData,
): Omit<
  JournalEntryProps,
  "id" | "status" | "postedAt" | "voidedAt" | "postedById" | "createdAt" | "updatedAt"
> {
  const lines = validateJournalLines(data.lines);
  assertJournalEntryBalanced(lines);

  return {
    journalNumber: createJournalNumber(data.journalNumber),
    journalDate: data.journalDate,
    description: createJournalDescription(data.description),
    referenceType: data.referenceType,
    referenceId: data.referenceId,
    lines,
    createdById: data.createdById,
  };
}

export function normalizeJournalEntryProps(
  props: JournalEntryProps,
): JournalEntryProps {
  const lines = validateJournalLines(
    props.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo,
      sortOrder: line.sortOrder,
    })),
  );
  assertJournalEntryBalanced(lines);

  return {
    ...props,
    journalNumber: createJournalNumber(props.journalNumber),
    description: createJournalDescription(props.description),
    lines,
  };
}

export function normalizeUpdateJournalEntryData(
  data: UpdateJournalEntryData,
): UpdateJournalEntryData {
  const normalized: UpdateJournalEntryData = { ...data };

  if (data.description !== undefined) {
    normalized.description = createJournalDescription(data.description);
  }

  if (data.lines !== undefined) {
    normalized.lines = data.lines;
  }

  return normalized;
}

export function computeJournalEntryUpdate(
  props: JournalEntryProps,
  data: UpdateJournalEntryData,
): JournalEntryProps {
  const normalized = normalizeUpdateJournalEntryData(data);
  const lines =
    normalized.lines !== undefined
      ? validateJournalLines(normalized.lines)
      : props.lines;
  assertJournalEntryBalanced(lines);

  return {
    ...props,
    journalDate: normalized.journalDate ?? props.journalDate,
    description: normalized.description ?? props.description,
    referenceType:
      normalized.referenceType !== undefined
        ? normalized.referenceType
        : props.referenceType,
    referenceId:
      normalized.referenceId !== undefined
        ? normalized.referenceId
        : props.referenceId,
    lines,
    updatedAt: new Date(),
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
