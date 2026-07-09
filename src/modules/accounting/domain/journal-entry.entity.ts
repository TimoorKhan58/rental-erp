import type { JournalEntryId, UserId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type {
  JournalEntryStatus,
  JournalReferenceType,
} from "./journal-entry.constants";
import {
  assertCanPost,
  assertCanUpdate,
  assertCanVoid,
  computeJournalEntryUpdate,
  normalizeCreateJournalEntryData,
  normalizeJournalEntryProps,
} from "./journal-entry.rules";
import type {
  CreateJournalEntryData,
  JournalEntryProps,
  UpdateJournalEntryData,
} from "./journal-entry.types";

export class JournalEntry implements Entity<JournalEntryId> {
  readonly id: JournalEntryId;
  readonly journalNumber: string;
  readonly journalDate: Date;
  readonly description: string;
  readonly referenceType: JournalReferenceType | null;
  readonly referenceId: string | null;
  readonly status: JournalEntryStatus;
  readonly postedAt: Date | null;
  readonly voidedAt: Date | null;
  readonly createdById: UserId;
  readonly postedById: UserId | null;
  readonly lines: JournalEntryProps["lines"];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: JournalEntryProps) {
    const normalized = normalizeJournalEntryProps(props);

    this.id = normalized.id;
    this.journalNumber = normalized.journalNumber;
    this.journalDate = normalized.journalDate;
    this.description = normalized.description;
    this.referenceType = normalized.referenceType;
    this.referenceId = normalized.referenceId;
    this.status = normalized.status;
    this.postedAt = normalized.postedAt;
    this.voidedAt = normalized.voidedAt;
    this.createdById = normalized.createdById;
    this.postedById = normalized.postedById;
    this.lines = normalized.lines;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateJournalEntryData,
  ): Omit<
    JournalEntryProps,
    "id" | "status" | "postedAt" | "voidedAt" | "postedById" | "createdAt" | "updatedAt"
  > {
    return normalizeCreateJournalEntryData(data);
  }

  static reconstitute(props: JournalEntryProps): JournalEntry {
    return new JournalEntry(props);
  }

  toProps(): JournalEntryProps {
    return {
      id: this.id,
      journalNumber: this.journalNumber,
      journalDate: this.journalDate,
      description: this.description,
      referenceType: this.referenceType,
      referenceId: this.referenceId,
      status: this.status,
      postedAt: this.postedAt,
      voidedAt: this.voidedAt,
      createdById: this.createdById,
      postedById: this.postedById,
      lines: this.lines.map((line) => ({ ...line })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  assertCanUpdate(): void {
    assertCanUpdate(this.status);
  }

  withUpdated(data: UpdateJournalEntryData): JournalEntry {
    assertCanUpdate(this.status);

    return JournalEntry.reconstitute(
      computeJournalEntryUpdate(this.toProps(), data),
    );
  }

  withPosted(postedById: UserId): JournalEntry {
    assertCanPost(this.status);

    return JournalEntry.reconstitute({
      ...this.toProps(),
      status: "POSTED",
      postedAt: new Date(),
      postedById,
      updatedAt: new Date(),
    });
  }

  withVoided(): JournalEntry {
    assertCanVoid(this.status);

    return JournalEntry.reconstitute({
      ...this.toProps(),
      status: "VOID",
      voidedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
