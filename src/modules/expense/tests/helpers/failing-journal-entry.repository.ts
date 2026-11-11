import type {
  CreateJournalEntryData,
  UpdateJournalEntryStatusData,
} from "@/modules/accounting/domain/journal-entry.types";
import {
  InMemoryJournalEntryRepository,
} from "@/modules/accounting/tests/helpers/in-memory-journal-entry.repository";
import type { JournalEntryId } from "@/shared/domain/ids";

export class FailingJournalEntryRepository extends InMemoryJournalEntryRepository {
  constructor(private readonly errorMessage = "Simulated accounting failure") {
    super();
  }

  override async create(_data: CreateJournalEntryData) {
    throw new Error(this.errorMessage);
  }

  override async updateStatus(
    _id: JournalEntryId,
    _data: UpdateJournalEntryStatusData,
  ) {
    throw new Error(this.errorMessage);
  }
}
