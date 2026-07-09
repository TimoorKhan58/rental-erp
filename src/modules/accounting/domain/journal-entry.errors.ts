import type { JournalEntryStatus } from "./journal-entry.constants";

export class JournalEntryInvalidStatusError extends Error {
  constructor(
    readonly currentStatus: JournalEntryStatus,
    readonly action: string,
  ) {
    super(`Cannot ${action} journal entry in ${currentStatus} status`);
    this.name = "JournalEntryInvalidStatusError";
  }
}

export class JournalEntryInvariantError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "JournalEntryInvariantError";
  }
}

export function createJournalNumber(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new JournalEntryInvariantError(
      "Journal number is required",
      "journalNumber",
    );
  }

  return trimmed;
}

export function createJournalDescription(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new JournalEntryInvariantError(
      "Journal description is required",
      "description",
    );
  }

  return trimmed;
}
