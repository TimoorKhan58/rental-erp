import { Prisma } from "@/generated/prisma/client";
import { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";
import type {
  JournalEntryStatus,
  JournalReferenceType,
} from "@/modules/accounting/domain/journal-entry.constants";
import type {
  CreateJournalEntryData,
  UpdateJournalEntryData,
  UpdateJournalEntryStatusData,
} from "@/modules/accounting/domain/journal-entry.types";
import type {
  AccountId,
  JournalEntryId,
  UserId,
} from "@/shared/domain/ids";

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function toJournalEntryDomain(record: {
  id: string;
  journalNumber: string;
  journalDate: Date;
  description: string;
  referenceType: JournalReferenceType | null;
  referenceId: string | null;
  status: JournalEntryStatus;
  postedAt: Date | null;
  voidedAt: Date | null;
  createdById: string;
  postedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    accountId: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    memo: string | null;
    sortOrder: number;
  }>;
}): JournalEntry {
  return JournalEntry.reconstitute({
    id: record.id as JournalEntryId,
    journalNumber: record.journalNumber,
    journalDate: record.journalDate,
    description: record.description,
    referenceType: record.referenceType,
    referenceId: record.referenceId,
    status: record.status,
    postedAt: record.postedAt,
    voidedAt: record.voidedAt,
    createdById: record.createdById as UserId,
    postedById: record.postedById as UserId | null,
    lines: record.lines.map((line) => ({
      id: line.id,
      accountId: line.accountId as AccountId,
      debit: decimalToNumber(line.debit),
      credit: decimalToNumber(line.credit),
      memo: line.memo,
      sortOrder: line.sortOrder,
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toJournalEntryCreateInput(
  data: CreateJournalEntryData,
): Prisma.JournalEntryCreateInput {
  const normalized = JournalEntry.create(data);

  return {
    journalNumber: normalized.journalNumber,
    journalDate: normalized.journalDate,
    description: normalized.description,
    referenceType: normalized.referenceType,
    referenceId: normalized.referenceId,
    status: "DRAFT",
    createdBy: { connect: { id: normalized.createdById } },
    lines: {
      create: normalized.lines.map((line) => ({
        account: { connect: { id: line.accountId } },
        debit: toPrismaDecimal(line.debit),
        credit: toPrismaDecimal(line.credit),
        memo: line.memo,
        sortOrder: line.sortOrder,
      })),
    },
  };
}

export function toJournalEntryUpdateInput(
  data: UpdateJournalEntryData,
  existing: JournalEntry,
): Prisma.JournalEntryUpdateInput {
  const updated = existing.withUpdated(data);
  const props = updated.toProps();
  const update: Prisma.JournalEntryUpdateInput = {};

  if (data.journalDate !== undefined) {
    update.journalDate = data.journalDate;
  }

  if (data.description !== undefined) {
    update.description = props.description;
  }

  if (data.referenceType !== undefined) {
    update.referenceType = data.referenceType;
  }

  if (data.referenceId !== undefined) {
    update.referenceId = data.referenceId;
  }

  if (data.lines !== undefined) {
    update.lines = {
      deleteMany: {},
      create: props.lines.map((line) => ({
        account: { connect: { id: line.accountId } },
        debit: toPrismaDecimal(line.debit),
        credit: toPrismaDecimal(line.credit),
        memo: line.memo,
        sortOrder: line.sortOrder,
      })),
    };
  }

  return update;
}

export function toJournalEntryStatusUpdateInput(
  data: UpdateJournalEntryStatusData,
): Prisma.JournalEntryUpdateInput {
  const update: Prisma.JournalEntryUpdateInput = {
    status: data.status,
  };

  if (data.postedAt !== undefined) {
    update.postedAt = data.postedAt;
  }

  if (data.voidedAt !== undefined) {
    update.voidedAt = data.voidedAt;
  }

  if (data.postedById !== undefined) {
    update.postedBy =
      data.postedById === null
        ? { disconnect: true }
        : { connect: { id: data.postedById } };
  }

  return update;
}

export const JOURNAL_ENTRY_INCLUDE = {
  lines: {
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
} as const satisfies Prisma.JournalEntryInclude;
