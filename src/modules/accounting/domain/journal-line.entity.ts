import type { AccountId } from "@/shared/domain/ids";

import { JournalEntryInvariantError } from "./journal-entry.errors";
import type { JournalLineProps } from "./journal-entry.types";

export function validateJournalLineAmounts(
  debit: number,
  credit: number,
): { debit: number; credit: number } {
  if (debit < 0) {
    throw new JournalEntryInvariantError(
      "Debit amount must be zero or greater",
      "debit",
    );
  }

  if (credit < 0) {
    throw new JournalEntryInvariantError(
      "Credit amount must be zero or greater",
      "credit",
    );
  }

  if (debit > 0 && credit > 0) {
    throw new JournalEntryInvariantError(
      "A journal line cannot have both debit and credit amounts",
      "debit",
    );
  }

  return {
    debit: roundMoney(debit),
    credit: roundMoney(credit),
  };
}

export class JournalLine {
  readonly id: string;
  readonly accountId: AccountId;
  readonly debit: number;
  readonly credit: number;
  readonly memo: string | null;
  readonly sortOrder: number;

  private constructor(props: JournalLineProps) {
    this.id = props.id;
    this.accountId = props.accountId;
    this.debit = props.debit;
    this.credit = props.credit;
    this.memo = props.memo;
    this.sortOrder = props.sortOrder;
  }

  static create(
    props: Omit<JournalLineProps, "id">,
  ): JournalLineProps {
    const amounts = validateJournalLineAmounts(props.debit, props.credit);

    if (amounts.debit === 0 && amounts.credit === 0) {
      throw new JournalEntryInvariantError(
        "Journal line must have a debit or credit amount",
        "debit",
      );
    }

    return {
      id: "",
      accountId: props.accountId,
      debit: amounts.debit,
      credit: amounts.credit,
      memo: normalizeOptionalText(props.memo),
      sortOrder: props.sortOrder,
    };
  }

  static reconstitute(props: JournalLineProps): JournalLine {
    return new JournalLine(props);
  }

  toProps(): JournalLineProps {
    return {
      id: this.id,
      accountId: this.accountId,
      debit: this.debit,
      credit: this.credit,
      memo: this.memo,
      sortOrder: this.sortOrder,
    };
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
