import { describe, expect, it } from "vitest";

import { JournalEntryInvariantError } from "@/modules/accounting/domain/journal-entry.errors";
import {
  assertJournalEntryBalanced,
  validateJournalLines,
} from "@/modules/accounting/domain/journal-entry.rules";
import { JournalLine } from "@/modules/accounting/domain/journal-line.entity";

import {
  ACCOUNT_ID,
  CASH_ACCOUNT_ID,
  buildCreateJournalEntryData,
} from "../tests/helpers/journal-entry.fixtures";

function buildBalancedLines(debit = 500, credit = 500) {
  return [
    {
      accountId: ACCOUNT_ID,
      debit,
      credit: 0,
      memo: "Debit",
      sortOrder: 0,
    },
    {
      accountId: CASH_ACCOUNT_ID,
      debit: 0,
      credit,
      memo: "Credit",
      sortOrder: 1,
    },
  ];
}

describe("assertJournalEntryBalanced", () => {
  it("accepts balanced journal lines", () => {
    const lines = validateJournalLines(buildBalancedLines());

    expect(() => assertJournalEntryBalanced(lines)).not.toThrow();
  });

  it("rejects unbalanced debits and credits", () => {
    const lines = validateJournalLines(buildBalancedLines(500, 400));

    expect(() => assertJournalEntryBalanced(lines)).toThrow(
      JournalEntryInvariantError,
    );
  });

  it("rejects zero total debits and credits", () => {
    const lines = [
      {
        id: "line-1",
        accountId: ACCOUNT_ID,
        debit: 0,
        credit: 0,
        memo: null,
        sortOrder: 0,
      },
      {
        id: "line-2",
        accountId: CASH_ACCOUNT_ID,
        debit: 0,
        credit: 0,
        memo: null,
        sortOrder: 1,
      },
    ];

    expect(() => assertJournalEntryBalanced(lines)).toThrow(
      JournalEntryInvariantError,
    );
  });

  it("rejects zero total credits with positive debits", () => {
    const lines = [
      JournalLine.create({
        accountId: ACCOUNT_ID,
        debit: 100,
        credit: 0,
        memo: null,
        sortOrder: 0,
      }),
      JournalLine.create({
        accountId: CASH_ACCOUNT_ID,
        debit: 100,
        credit: 0,
        memo: null,
        sortOrder: 1,
      }),
    ];

    expect(() => assertJournalEntryBalanced(lines)).toThrow(
      JournalEntryInvariantError,
    );
  });

  it("includes debit and credit totals in error message", () => {
    const lines = validateJournalLines(buildBalancedLines(500, 300));

    try {
      assertJournalEntryBalanced(lines);
    } catch (error) {
      expect(error).toBeInstanceOf(JournalEntryInvariantError);
      expect((error as JournalEntryInvariantError).message).toContain("500");
      expect((error as JournalEntryInvariantError).message).toContain("300");
    }
  });

  it("balances amounts rounded to two decimal places", () => {
    const lines = validateJournalLines([
      {
        accountId: ACCOUNT_ID,
        debit: 33.335,
        credit: 0,
        memo: null,
        sortOrder: 0,
      },
      {
        accountId: CASH_ACCOUNT_ID,
        debit: 0,
        credit: 33.33,
        memo: null,
        sortOrder: 1,
      },
      {
        accountId: ACCOUNT_ID,
        debit: 0,
        credit: 0.005,
        memo: null,
        sortOrder: 2,
      },
    ]);

    expect(() => assertJournalEntryBalanced(lines)).not.toThrow();
  });

  it("rejects imbalance after rounding", () => {
    const lines = validateJournalLines([
      {
        accountId: ACCOUNT_ID,
        debit: 10.005,
        credit: 0,
        memo: null,
        sortOrder: 0,
      },
      {
        accountId: CASH_ACCOUNT_ID,
        debit: 0,
        credit: 10,
        memo: null,
        sortOrder: 1,
      },
    ]);

    expect(() => assertJournalEntryBalanced(lines)).toThrow(
      JournalEntryInvariantError,
    );
  });

  it("accepts multi-line balanced entry", () => {
    const lines = validateJournalLines([
      {
        accountId: ACCOUNT_ID,
        debit: 200,
        credit: 0,
        memo: null,
        sortOrder: 0,
      },
      {
        accountId: CASH_ACCOUNT_ID,
        debit: 300,
        credit: 0,
        memo: null,
        sortOrder: 1,
      },
      {
        accountId: ACCOUNT_ID,
        debit: 0,
        credit: 500,
        memo: null,
        sortOrder: 2,
      },
    ]);

    expect(() => assertJournalEntryBalanced(lines)).not.toThrow();
  });

  it("JournalEntry.create enforces balancing", () => {
    expect(() =>
      validateJournalLines(buildBalancedLines(100, 50)),
    ).not.toThrow();

    expect(() =>
      assertJournalEntryBalanced(
        validateJournalLines(buildBalancedLines(100, 50)),
      ),
    ).toThrow(JournalEntryInvariantError);
  });

  it("sets lines field on balancing error", () => {
    try {
      assertJournalEntryBalanced(
        validateJournalLines(buildBalancedLines(100, 50)),
      );
    } catch (error) {
      expect((error as JournalEntryInvariantError).field).toBe("lines");
    }
  });

  it("accepts large balanced amounts", () => {
    const lines = validateJournalLines(buildBalancedLines(1_000_000, 1_000_000));

    expect(() => assertJournalEntryBalanced(lines)).not.toThrow();
  });

  it("rejects single-sided positive debits only", () => {
    const lines = validateJournalLines([
      {
        accountId: ACCOUNT_ID,
        debit: 250,
        credit: 0,
        memo: null,
        sortOrder: 0,
      },
      {
        accountId: CASH_ACCOUNT_ID,
        debit: 250,
        credit: 0,
        memo: null,
        sortOrder: 1,
      },
    ]);

    expect(() => assertJournalEntryBalanced(lines)).toThrow(
      JournalEntryInvariantError,
    );
  });
});

describe("balancing via JournalEntry.create", () => {
  it("creates balanced journal entry data", () => {
    const data = buildCreateJournalEntryData();

    expect(() => validateJournalLines(data.lines)).not.toThrow();
  });

  it("rejects create data with unbalanced lines", () => {
    expect(() =>
      validateJournalLines(buildBalancedLines(500, 499)),
    ).not.toThrow();

    expect(() =>
      assertJournalEntryBalanced(
        validateJournalLines(buildBalancedLines(500, 499)),
      ),
    ).toThrow(JournalEntryInvariantError);
  });
});
