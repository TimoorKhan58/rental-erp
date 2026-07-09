import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { JournalEntryDto } from "../dtos/journal-entry.dto";
import {
  toJournalEntryDto,
  toJournalEntryListQuery,
} from "../mappers/journal-entry.mapper";
import {
  ListJournalEntriesSchema,
  type ListJournalEntriesInput,
} from "../schemas/list-journal-entries.schema";

export class ListJournalEntriesService {
  constructor(
    private readonly journalEntryRepository: IJournalEntryRepository,
  ) {}

  async execute(
    input: ListJournalEntriesInput,
  ): Promise<PaginatedResult<JournalEntryDto>> {
    const query = parseRequest(ListJournalEntriesSchema, input);
    const result = await this.journalEntryRepository.findPaged(
      toJournalEntryListQuery(query),
    );

    return {
      items: result.items.map(toJournalEntryDto),
      meta: result.meta,
    };
  }
}
