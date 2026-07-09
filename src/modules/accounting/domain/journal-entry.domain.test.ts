import { describe, expect, it } from "vitest";

import { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";
import { JOURNAL_REFERENCE_TYPES } from "@/modules/accounting/domain/journal-entry.constants";
import {
  JournalEntryInvalidStatusError,
  JournalEntryInvariantError,
  createJournalDescription,
  createJournalNumber,
} from "@/modules/accounting/domain/journal-entry.errors";
import { validateJournalLineAmounts } from "@/modules/accounting/domain/journal-line.entity";

import {
  ACCOUNT_ID,
  CASH_ACCOUNT_ID,
  JOURNAL_ENTRY_ID,
  USER_ID,
  buildCreateJournalEntryData,
  buildJournalEntryEntity,
  buildPostedJournalEntryEntity,
  buildVoidJournalEntryEntity,
} from "../tests/helpers/journal-entry.fixtures";

describe("JournalEntry entity", () => {
  it("creates normalized journal entry props", () => {
    const props = JournalEntry.create(buildCreateJournalEntryData());

    expect(props.journalNumber).toBe("JE-2026-001");
    expect(props.description).toBe("Opening balance entry");
    expect(props.referenceType).toBe("MANUAL");
    expect(props.lines).toHaveLength(2);
    expect(props.createdById).toBe(USER_ID);
  });

  it("rejects empty journal number", () => {
    expect(() =>
      JournalEntry.create(
        buildCreateJournalEntryData({ journalNumber: "   " }),
      ),
    ).toThrow(JournalEntryInvariantError);
  });

  it("rejects empty description", () => {
    expect(() =>
      JournalEntry.create(
        buildCreateJournalEntryData({ description: "   " }),
      ),
    ).toThrow(JournalEntryInvariantError);
  });

  it("rejects fewer than two lines", () => {
    expect(() =>
      JournalEntry.create(
        buildCreateJournalEntryData({
          lines: [
            {
              accountId: ACCOUNT_ID,
              debit: 100,
              credit: 0,
              memo: null,
              sortOrder: 0,
            },
          ],
        }),
      ),
    ).toThrow(JournalEntryInvariantError);
  });

  it("rejects unbalanced lines", () => {
    expect(() =>
      JournalEntry.create(
        buildCreateJournalEntryData({
          lines: [
            {
              accountId: ACCOUNT_ID,
              debit: 500,
              credit: 0,
              memo: null,
              sortOrder: 0,
            },
            {
              accountId: CASH_ACCOUNT_ID,
              debit: 0,
              credit: 400,
              memo: null,
              sortOrder: 1,
            },
          ],
        }),
      ),
    ).toThrow(JournalEntryInvariantError);
  });

  it("rejects line with both debit and credit", () => {
    expect(() =>
      JournalEntry.create(
        buildCreateJournalEntryData({
          lines: [
            {
              accountId: ACCOUNT_ID,
              debit: 100,
              credit: 100,
              memo: null,
              sortOrder: 0,
            },
            {
              accountId: CASH_ACCOUNT_ID,
              debit: 0,
              credit: 100,
              memo: null,
              sortOrder: 1,
            },
          ],
        }),
      ),
    ).toThrow(JournalEntryInvariantError);
  });

  it("rejects negative debit amount", () => {
    expect(() =>
      JournalEntry.create(
        buildCreateJournalEntryData({
          lines: [
            {
              accountId: ACCOUNT_ID,
              debit: -10,
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
          ],
        }),
      ),
    ).toThrow(JournalEntryInvariantError);
  });

  it("rejects zero debit and credit on a line", () => {
    expect(() =>
      JournalEntry.create(
        buildCreateJournalEntryData({
          lines: [
            {
              accountId: ACCOUNT_ID,
              debit: 0,
              credit: 0,
              memo: null,
              sortOrder: 0,
            },
            {
              accountId: CASH_ACCOUNT_ID,
              debit: 0,
              credit: 500,
              memo: null,
              sortOrder: 1,
            },
          ],
        }),
      ),
    ).toThrow(JournalEntryInvariantError);
  });

  it("trims journal number on create", () => {
    const props = JournalEntry.create(
      buildCreateJournalEntryData({ journalNumber: "  JE-2026-002  " }),
    );

    expect(props.journalNumber).toBe("JE-2026-002");
  });

  it("trims description on create", () => {
    const props = JournalEntry.create(
      buildCreateJournalEntryData({ description: "  Adjusting entry  " }),
    );

    expect(props.description).toBe("Adjusting entry");
  });

  it("normalizes blank line memo to null", () => {
    const props = JournalEntry.create(
      buildCreateJournalEntryData({
        lines: [
          {
            accountId: ACCOUNT_ID,
            debit: 500,
            credit: 0,
            memo: "   ",
            sortOrder: 0,
          },
          {
            accountId: CASH_ACCOUNT_ID,
            debit: 0,
            credit: 500,
            memo: null,
            sortOrder: 1,
          },
        ],
      }),
    );

    expect(props.lines[0]?.memo).toBeNull();
  });

  it("reconstitutes persisted journal entry", () => {
    const entry = buildJournalEntryEntity();

    expect(entry.id).toBe(JOURNAL_ENTRY_ID);
    expect(entry.status).toBe("DRAFT");
    expect(entry.lines).toHaveLength(2);
  });

  it("updates draft journal entry", () => {
    const entry = buildJournalEntryEntity();
    const updated = entry.withUpdated({ description: "Updated description" });

    expect(updated.description).toBe("Updated description");
    expect(updated.journalNumber).toBe(entry.journalNumber);
  });

  it("rejects update when not draft", () => {
    const entry = buildPostedJournalEntryEntity();

    expect(() => entry.withUpdated({ description: "Updated" })).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("posts draft journal entry", () => {
    const entry = buildJournalEntryEntity();
    const posted = entry.withPosted(USER_ID);

    expect(posted.status).toBe("POSTED");
    expect(posted.postedAt).not.toBeNull();
    expect(posted.postedById).toBe(USER_ID);
  });

  it("rejects post when not draft", () => {
    const entry = buildPostedJournalEntryEntity();

    expect(() => entry.withPosted(USER_ID)).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("voids draft journal entry", () => {
    const entry = buildJournalEntryEntity();
    const voided = entry.withVoided();

    expect(voided.status).toBe("VOID");
    expect(voided.voidedAt).not.toBeNull();
  });

  it("voids posted journal entry", () => {
    const entry = buildPostedJournalEntryEntity();
    const voided = entry.withVoided();

    expect(voided.status).toBe("VOID");
    expect(voided.voidedAt).not.toBeNull();
    expect(voided.postedAt).not.toBeNull();
  });

  it("rejects void when already void", () => {
    const entry = buildVoidJournalEntryEntity();

    expect(() => entry.withVoided()).toThrow(JournalEntryInvalidStatusError);
  });

  it("assertCanUpdate allows draft only", () => {
    expect(() => buildJournalEntryEntity().assertCanUpdate()).not.toThrow();
    expect(() => buildPostedJournalEntryEntity().assertCanUpdate()).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("toProps returns full journal entry state", () => {
    const entry = buildJournalEntryEntity();
    const props = entry.toProps();

    expect(props.id).toBe(JOURNAL_ENTRY_ID);
    expect(props.journalNumber).toBe("JE-2026-001");
    expect(props.status).toBe("DRAFT");
    expect(props.lines).toHaveLength(2);
  });

  it("accepts all reference types", () => {
    for (const referenceType of JOURNAL_REFERENCE_TYPES) {
      const props = JournalEntry.create(
        buildCreateJournalEntryData({ referenceType }),
      );

      expect(props.referenceType).toBe(referenceType);
    }
  });

  it("preserves unchanged fields on partial update", () => {
    const entry = buildJournalEntryEntity();
    const updated = entry.withUpdated({ description: "Only description" });

    expect(updated.journalDate).toEqual(entry.journalDate);
    expect(updated.referenceType).toBe(entry.referenceType);
    expect(updated.lines).toHaveLength(entry.lines.length);
  });
});

describe("Journal line amounts", () => {
  it("validateJournalLineAmounts rounds to two decimals", () => {
    const amounts = validateJournalLineAmounts(99.999, 0);

    expect(amounts.debit).toBe(100);
    expect(amounts.credit).toBe(0);
  });

  it("createJournalNumber trims and validates", () => {
    expect(createJournalNumber("  JE-001  ")).toBe("JE-001");
    expect(() => createJournalNumber("   ")).toThrow(
      JournalEntryInvariantError,
    );
  });

  it("createJournalDescription trims and validates", () => {
    expect(createJournalDescription("  Entry  ")).toBe("Entry");
    expect(() => createJournalDescription("   ")).toThrow(
      JournalEntryInvariantError,
    );
  });

  it("assigns default sort order by index", () => {
    const props = JournalEntry.create(
      buildCreateJournalEntryData({
        lines: [
          {
            accountId: ACCOUNT_ID,
            debit: 250,
            credit: 0,
            memo: null,
          },
          {
            accountId: CASH_ACCOUNT_ID,
            debit: 0,
            credit: 250,
            memo: null,
          },
        ],
      }),
    );

    expect(props.lines[0]?.sortOrder).toBe(0);
    expect(props.lines[1]?.sortOrder).toBe(1);
  });

  it("rejects negative credit amount", () => {
    expect(() => validateJournalLineAmounts(0, -5)).toThrow(
      JournalEntryInvariantError,
    );
  });

  it("posted entity retains lines on reconstitute", () => {
    const posted = buildPostedJournalEntryEntity();

    expect(posted.lines[0]?.debit).toBe(500);
    expect(posted.lines[1]?.credit).toBe(500);
  });

  it("void entity from posted retains posted timestamp", () => {
    const voided = buildVoidJournalEntryEntity(true);

    expect(voided.status).toBe("VOID");
    expect(voided.postedAt).not.toBeNull();
    expect(voided.voidedAt).not.toBeNull();
  });
});
