import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { JournalEntryDto } from "../dtos/journal-entry.dto";
import {
  toJournalEntryDto,
  toJournalEntryId,
} from "../mappers/journal-entry.mapper";
import {
  JournalEntryIdParamSchema,
  type JournalEntryIdParamInput,
} from "../schemas/journal-entry.schemas";

export class GetJournalEntryByIdService {
  constructor(
    private readonly journalEntryRepository: IJournalEntryRepository,
  ) {}

  async execute(params: JournalEntryIdParamInput): Promise<JournalEntryDto> {
    const { id } = parseRequest(JournalEntryIdParamSchema, params);

    const entry = await this.journalEntryRepository.findById(
      toJournalEntryId(id),
    );

    if (entry === null) {
      throw new NotFoundError({
        message: "Journal entry not found",
        details: { id },
      });
    }

    return toJournalEntryDto(entry);
  }
}
