import { describe, expect, it } from "vitest";

import { InMemoryJournalEntryRepository } from "./helpers/in-memory-journal-entry.repository";
import {
  JOURNAL_ENTRY_ID,
  OTHER_JOURNAL_ENTRY_ID,
  USER_ID,
  buildCreateJournalEntryData,
  buildJournalEntryEntity,
  buildPostedJournalEntryEntity,
} from "./helpers/journal-entry.fixtures";

describe("InMemoryJournalEntryRepository", () => {
  it("finds journal entry by id", async () => {
    const repository = new InMemoryJournalEntryRepository();
    repository.seed([buildJournalEntryEntity()]);

    const found = await repository.findById(JOURNAL_ENTRY_ID);

    expect(found?.journalNumber).toBe("JE-2026-001");
  });

  it("finds journal entry by journal number", async () => {
    const repository = new InMemoryJournalEntryRepository();
    repository.seed([buildJournalEntryEntity()]);

    const found = await repository.findByJournalNumber("JE-2026-001");

    expect(found?.id).toBe(JOURNAL_ENTRY_ID);
  });

  it("creates journal entry in draft status", async () => {
    const repository = new InMemoryJournalEntryRepository();

    const created = await repository.create(buildCreateJournalEntryData());

    expect(created.status).toBe("DRAFT");
    expect(created.lines).toHaveLength(2);
    expect(repository.count()).toBe(1);
  });

  it("updates draft journal entry fields", async () => {
    const repository = new InMemoryJournalEntryRepository();
    repository.seed([buildJournalEntryEntity()]);

    const updated = await repository.update(JOURNAL_ENTRY_ID, {
      description: "Updated entry",
    });

    expect(updated.description).toBe("Updated entry");
  });

  it("updates status with timestamps", async () => {
    const repository = new InMemoryJournalEntryRepository();
    const entry = buildJournalEntryEntity();
    repository.seed([entry]);
    const postedAt = new Date("2026-01-18T10:00:00.000Z");

    const updated = await repository.updateStatus(entry.id, {
      status: "POSTED",
      postedAt,
      postedById: USER_ID,
    });

    expect(updated.status).toBe("POSTED");
    expect(updated.postedAt).toEqual(postedAt);
    expect(updated.postedById).toBe(USER_ID);
  });

  it("filters paged results by status", async () => {
    const repository = new InMemoryJournalEntryRepository();
    repository.seed([
      buildJournalEntryEntity(),
      buildPostedJournalEntryEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      status: "POSTED",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("POSTED");
  });

  it("filters paged results by reference type", async () => {
    const repository = new InMemoryJournalEntryRepository();
    repository.seed([buildJournalEntryEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      referenceType: "MANUAL",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.referenceType).toBe("MANUAL");
  });

  it("filters paged results by search term", async () => {
    const repository = new InMemoryJournalEntryRepository();
    repository.seed([buildJournalEntryEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      search: "opening",
    });

    expect(result.items).toHaveLength(1);
  });

  it("sorts paged results by journal date", async () => {
    const repository = new InMemoryJournalEntryRepository();
    const earlier = buildJournalEntryEntity();
    const later = buildJournalEntryEntity({
      id: OTHER_JOURNAL_ENTRY_ID,
      journalNumber: "JE-2026-002",
      createdAt: new Date("2026-02-01T10:00:00.000Z"),
    });
    repository.seed([later, earlier]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "asc",
      sortBy: "journalDate",
    });

    expect(result.items).toHaveLength(2);
  });

  it("throws when updating missing journal entry", async () => {
    const repository = new InMemoryJournalEntryRepository();

    await expect(
      repository.update(JOURNAL_ENTRY_ID, { description: "Missing" }),
    ).rejects.toThrow("Journal entry not found");
  });
});
