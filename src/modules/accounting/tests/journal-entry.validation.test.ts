import { describe, expect, it } from "vitest";

import {
  CreateJournalEntrySchema,
  JournalEntryIdParamSchema,
  UpdateJournalEntrySchema,
} from "@/modules/accounting/application/schemas/journal-entry.schemas";
import { ListJournalEntriesSchema } from "@/modules/accounting/application/schemas/list-journal-entries.schema";

import {
  ACCOUNT_ID,
  CASH_ACCOUNT_ID,
  JOURNAL_ENTRY_ID,
  VALID_CREATE_JOURNAL_INPUT,
} from "./helpers/journal-entry.fixtures";

describe("CreateJournalEntrySchema", () => {
  it("accepts valid create input", () => {
    const result = CreateJournalEntrySchema.parse(VALID_CREATE_JOURNAL_INPUT);

    expect(result.journalNumber).toBe("JE-2026-001");
    expect(result.description).toBe("Opening balance entry");
    expect(result.lines).toHaveLength(2);
  });

  it("rejects empty journal number", () => {
    expect(() =>
      CreateJournalEntrySchema.parse({
        ...VALID_CREATE_JOURNAL_INPUT,
        journalNumber: "",
      }),
    ).toThrow();
  });

  it("rejects empty description", () => {
    expect(() =>
      CreateJournalEntrySchema.parse({
        ...VALID_CREATE_JOURNAL_INPUT,
        description: "",
      }),
    ).toThrow();
  });

  it("rejects fewer than two lines", () => {
    expect(() =>
      CreateJournalEntrySchema.parse({
        ...VALID_CREATE_JOURNAL_INPUT,
        lines: [
          {
            accountId: ACCOUNT_ID,
            debit: 100,
            credit: 0,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects invalid account id on line", () => {
    expect(() =>
      CreateJournalEntrySchema.parse({
        ...VALID_CREATE_JOURNAL_INPUT,
        lines: [
          {
            accountId: "bad",
            debit: 100,
            credit: 0,
          },
          {
            accountId: CASH_ACCOUNT_ID,
            debit: 0,
            credit: 100,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects negative debit amount", () => {
    expect(() =>
      CreateJournalEntrySchema.parse({
        ...VALID_CREATE_JOURNAL_INPUT,
        lines: [
          {
            accountId: ACCOUNT_ID,
            debit: -10,
            credit: 0,
          },
          {
            accountId: CASH_ACCOUNT_ID,
            debit: 0,
            credit: 10,
          },
        ],
      }),
    ).toThrow();
  });

  it("accepts null reference type", () => {
    const result = CreateJournalEntrySchema.parse({
      ...VALID_CREATE_JOURNAL_INPUT,
      referenceType: null,
    });

    expect(result.referenceType).toBeNull();
  });

  it("accepts all valid reference types", () => {
    for (const referenceType of [
      "RENTAL_INVOICE",
      "PAYMENT",
      "MANUAL",
      "OTHER",
    ] as const) {
      const result = CreateJournalEntrySchema.parse({
        ...VALID_CREATE_JOURNAL_INPUT,
        referenceType,
      });

      expect(result.referenceType).toBe(referenceType);
    }
  });

  it("coerces string debit to number", () => {
    const result = CreateJournalEntrySchema.parse({
      ...VALID_CREATE_JOURNAL_INPUT,
      lines: [
        {
          accountId: ACCOUNT_ID,
          debit: "250",
          credit: 0,
        },
        {
          accountId: CASH_ACCOUNT_ID,
          debit: 0,
          credit: "250",
        },
      ],
    });

    expect(result.lines[0]?.debit).toBe(250);
    expect(result.lines[1]?.credit).toBe(250);
  });
});

describe("UpdateJournalEntrySchema", () => {
  it("accepts description update", () => {
    const result = UpdateJournalEntrySchema.parse({
      description: "Updated entry",
    });

    expect(result.description).toBe("Updated entry");
  });

  it("accepts journal date update", () => {
    const result = UpdateJournalEntrySchema.parse({
      journalDate: "2026-03-01T00:00:00.000Z",
    });

    expect(result.journalDate).toBeInstanceOf(Date);
  });

  it("accepts lines update", () => {
    const result = UpdateJournalEntrySchema.parse({
      lines: VALID_CREATE_JOURNAL_INPUT.lines,
    });

    expect(result.lines).toHaveLength(2);
  });

  it("rejects empty update payload", () => {
    expect(() => UpdateJournalEntrySchema.parse({})).toThrow();
  });

  it("accepts reference type update", () => {
    const result = UpdateJournalEntrySchema.parse({
      referenceType: "PAYMENT",
    });

    expect(result.referenceType).toBe("PAYMENT");
  });

  it("rejects single line update", () => {
    expect(() =>
      UpdateJournalEntrySchema.parse({
        lines: [
          {
            accountId: ACCOUNT_ID,
            debit: 100,
            credit: 0,
          },
        ],
      }),
    ).toThrow();
  });

  it("accepts null reference id on update", () => {
    const result = UpdateJournalEntrySchema.parse({
      referenceId: null,
    });

    expect(result.referenceId).toBeNull();
  });
});

describe("JournalEntryIdParamSchema", () => {
  it("accepts valid journal entry id", () => {
    const result = JournalEntryIdParamSchema.parse({ id: JOURNAL_ENTRY_ID });

    expect(result.id).toBe(JOURNAL_ENTRY_ID);
  });

  it("rejects invalid journal entry id", () => {
    expect(() => JournalEntryIdParamSchema.parse({ id: "bad" })).toThrow();
  });
});

describe("ListJournalEntriesSchema", () => {
  it("accepts valid list query", () => {
    const result = ListJournalEntriesSchema.parse({
      page: "1",
      pageSize: "20",
      sortOrder: "desc",
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts status filter", () => {
    const result = ListJournalEntriesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      status: "DRAFT",
    });

    expect(result.status).toBe("DRAFT");
  });

  it("accepts reference type filter", () => {
    const result = ListJournalEntriesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      referenceType: "MANUAL",
    });

    expect(result.referenceType).toBe("MANUAL");
  });

  it("accepts journal date range filters", () => {
    const result = ListJournalEntriesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      journalDateFrom: "2026-01-01T00:00:00.000Z",
      journalDateTo: "2026-12-31T00:00:00.000Z",
    });

    expect(result.journalDateFrom).toBeInstanceOf(Date);
    expect(result.journalDateTo).toBeInstanceOf(Date);
  });

  it("rejects search term over 200 characters", () => {
    expect(() =>
      ListJournalEntriesSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        search: "x".repeat(201),
      }),
    ).toThrow();
  });

  it("accepts sortBy field", () => {
    const result = ListJournalEntriesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "asc",
      sortBy: "journalDate",
    });

    expect(result.sortBy).toBe("journalDate");
  });

  it("rejects invalid status filter", () => {
    expect(() =>
      ListJournalEntriesSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        status: "INVALID",
      }),
    ).toThrow();
  });
});
