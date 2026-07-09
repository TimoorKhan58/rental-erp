import { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";
import type { JournalEntryListQuery } from "@/modules/accounting/domain/journal-entry-list.query";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import type {
  CreateJournalEntryData,
  UpdateJournalEntryData,
  UpdateJournalEntryStatusData,
} from "@/modules/accounting/domain/journal-entry.types";
import type { JournalEntryId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildJournalEntryEntity } from "./journal-entry.fixtures";

interface StoredJournalEntry {
  record: ReturnType<JournalEntry["toProps"]>;
}

export class InMemoryJournalEntryRepository implements IJournalEntryRepository {
  private readonly store = new Map<string, StoredJournalEntry>();

  snapshot(): Map<string, StoredJournalEntry> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredJournalEntry>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(entries: JournalEntry[]): void {
    this.store.clear();
    for (const entry of entries) {
      const props = entry.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: JournalEntryId): Promise<JournalEntry | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? JournalEntry.reconstitute(stored.record) : null,
    );
  }

  findByJournalNumber(journalNumber: string): Promise<JournalEntry | null> {
    for (const stored of this.store.values()) {
      if (stored.record.journalNumber === journalNumber) {
        return Promise.resolve(JournalEntry.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(
    query: JournalEntryListQuery,
  ): Promise<PaginatedResult<JournalEntry>> {
    let items = Array.from(this.store.values()).map((stored) =>
      JournalEntry.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.referenceType !== undefined) {
      items = items.filter((item) => item.referenceType === query.referenceType);
    }

    if (query.journalDateFrom !== undefined) {
      items = items.filter(
        (item) => item.journalDate >= query.journalDateFrom!,
      );
    }

    if (query.journalDateTo !== undefined) {
      items = items.filter((item) => item.journalDate <= query.journalDateTo!);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.journalNumber.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        let leftValue: string;
        let rightValue: string;

        if (query.sortBy === "journalDate") {
          leftValue = String(left.journalDate.getTime());
          rightValue = String(right.journalDate.getTime());
        } else if (query.sortBy === "createdAt") {
          leftValue = String(left.createdAt.getTime());
          rightValue = String(right.createdAt.getTime());
        } else {
          leftValue = String(
            left[query.sortBy as keyof JournalEntry] ?? "",
          ).toLowerCase();
          rightValue = String(
            right[query.sortBy as keyof JournalEntry] ?? "",
          ).toLowerCase();
        }

        return leftValue.localeCompare(rightValue) * direction;
      });
    }

    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    const pagedItems = items.slice(start, start + query.pageSize);

    return {
      items: pagedItems,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  async create(data: CreateJournalEntryData): Promise<JournalEntry> {
    const normalized = JournalEntry.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as JournalEntryId;

    const entry = JournalEntry.reconstitute({
      id,
      ...normalized,
      status: "DRAFT",
      postedAt: null,
      voidedAt: null,
      postedById: null,
      lines: normalized.lines.map((line, index) => ({
        ...line,
        id: crypto.randomUUID(),
        sortOrder: line.sortOrder ?? index,
      })),
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: entry.toProps() });
    return entry;
  }

  async update(
    id: JournalEntryId,
    data: UpdateJournalEntryData,
  ): Promise<JournalEntry> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Journal entry not found");
    }

    const entity = JournalEntry.reconstitute(existing.record);
    const updated = entity.withUpdated(data);
    const props = updated.toProps();

    this.store.set(id, {
      record: {
        ...props,
        lines: props.lines.map((line, index) => ({
          ...line,
          id: line.id || crypto.randomUUID(),
          sortOrder: line.sortOrder ?? index,
        })),
      },
    });

    return JournalEntry.reconstitute(this.store.get(id)!.record);
  }

  async updateStatus(
    id: JournalEntryId,
    data: UpdateJournalEntryStatusData,
  ): Promise<JournalEntry> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Journal entry not found");
    }

    const updated = JournalEntry.reconstitute({
      ...existing.record,
      status: data.status,
      postedAt:
        data.postedAt !== undefined ? data.postedAt : existing.record.postedAt,
      voidedAt:
        data.voidedAt !== undefined ? data.voidedAt : existing.record.voidedAt,
      postedById:
        data.postedById !== undefined
          ? data.postedById
          : existing.record.postedById,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededJournalEntryRepository(
  entries: JournalEntry[] = [buildJournalEntryEntity()],
): InMemoryJournalEntryRepository {
  const repository = new InMemoryJournalEntryRepository();
  repository.seed(entries);
  return repository;
}
