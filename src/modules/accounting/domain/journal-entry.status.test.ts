import { describe, expect, it } from "vitest";

import { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";
import {
  assertCanPost,
  assertCanUpdate,
  assertCanVoid,
  assertImmutablePostedJournal,
} from "@/modules/accounting/domain/journal-entry.rules";
import { JournalEntryInvalidStatusError } from "@/modules/accounting/domain/journal-entry.errors";

import {
  buildCreateJournalEntryData,
  buildJournalEntryEntity,
  buildPostedJournalEntryEntity,
  buildVoidJournalEntryEntity,
  USER_ID,
} from "../tests/helpers/journal-entry.fixtures";

describe("status transition guards", () => {
  it("assertCanUpdate allows draft", () => {
    expect(() => assertCanUpdate("DRAFT")).not.toThrow();
  });

  it("assertCanUpdate rejects posted", () => {
    expect(() => assertCanUpdate("POSTED")).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("assertCanUpdate rejects void", () => {
    expect(() => assertCanUpdate("VOID")).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("assertCanPost allows draft", () => {
    expect(() => assertCanPost("DRAFT")).not.toThrow();
  });

  it("assertCanPost rejects posted", () => {
    expect(() => assertCanPost("POSTED")).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("assertCanPost rejects void", () => {
    expect(() => assertCanPost("VOID")).toThrow(JournalEntryInvalidStatusError);
  });

  it("assertCanVoid allows draft", () => {
    expect(() => assertCanVoid("DRAFT")).not.toThrow();
  });

  it("assertCanVoid allows posted", () => {
    expect(() => assertCanVoid("POSTED")).not.toThrow();
  });

  it("assertCanVoid rejects void", () => {
    expect(() => assertCanVoid("VOID")).toThrow(JournalEntryInvalidStatusError);
  });

  it("assertImmutablePostedJournal rejects posted", () => {
    expect(() => assertImmutablePostedJournal("POSTED")).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("assertImmutablePostedJournal allows draft", () => {
    expect(() => assertImmutablePostedJournal("DRAFT")).not.toThrow();
  });

  it("assertImmutablePostedJournal allows void", () => {
    expect(() => assertImmutablePostedJournal("VOID")).not.toThrow();
  });
});

describe("journal entry entity transitions", () => {
  it("transitions from draft to posted", () => {
    const draft = buildJournalEntryEntity();
    const posted = draft.withPosted(USER_ID);

    expect(posted.status).toBe("POSTED");
    expect(posted.postedAt).not.toBeNull();
    expect(posted.voidedAt).toBeNull();
  });

  it("transitions from draft to void without posting", () => {
    const draft = buildJournalEntryEntity();
    const voided = draft.withVoided();

    expect(voided.status).toBe("VOID");
    expect(voided.postedAt).toBeNull();
    expect(voided.voidedAt).not.toBeNull();
  });

  it("transitions from posted to void", () => {
    const posted = buildPostedJournalEntryEntity();
    const voided = posted.withVoided();

    expect(voided.status).toBe("VOID");
    expect(voided.postedAt).not.toBeNull();
    expect(voided.voidedAt).not.toBeNull();
  });

  it("rejects post on void entry", () => {
    const voided = buildVoidJournalEntryEntity();

    expect(() => voided.withPosted(USER_ID)).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("rejects update on void entry", () => {
    const voided = buildVoidJournalEntryEntity();

    expect(() => voided.withUpdated({ description: "Updated" })).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("rejects update on posted entry", () => {
    const posted = buildPostedJournalEntryEntity();

    expect(() => posted.withUpdated({ description: "Updated" })).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("posted entry cannot be updated via assertCanUpdate", () => {
    const posted = buildPostedJournalEntryEntity();

    expect(() => posted.assertCanUpdate()).toThrow(
      JournalEntryInvalidStatusError,
    );
  });

  it("void entry cannot be voided again", () => {
    const voided = buildVoidJournalEntryEntity(true);

    expect(() => voided.withVoided()).toThrow(JournalEntryInvalidStatusError);
  });

  it("create always produces draft-capable data", () => {
    const props = JournalEntry.create(buildCreateJournalEntryData());

    expect(props.journalNumber).toBe("JE-2026-001");
    expect(props.lines.length).toBeGreaterThanOrEqual(2);
  });

  it("JournalEntryInvalidStatusError includes action and status", () => {
    try {
      assertCanPost("POSTED");
    } catch (error) {
      expect(error).toBeInstanceOf(JournalEntryInvalidStatusError);
      expect((error as JournalEntryInvalidStatusError).currentStatus).toBe(
        "POSTED",
      );
      expect((error as JournalEntryInvalidStatusError).action).toBe("post");
    }
  });
});
