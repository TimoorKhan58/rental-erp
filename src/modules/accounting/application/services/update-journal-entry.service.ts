import {
  JournalEntryInvalidStatusError,
  JournalEntryInvariantError,
  validateJournalLines,
} from "@/modules/accounting/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { JournalEntryDto } from "../dtos/journal-entry.dto";
import {
  toJournalEntryDto,
  toJournalEntryId,
  toUpdateJournalEntryData,
} from "../mappers/journal-entry.mapper";
import {
  JournalEntryIdParamSchema,
  UpdateJournalEntrySchema,
  type JournalEntryIdParamInput,
  type UpdateJournalEntryInput,
} from "../schemas/journal-entry.schemas";
import {
  JOURNAL_ENTRY_ENTITY_NAME,
  JOURNAL_ENTRY_MODULE,
} from "./accounting-service.constants";
import type { IAccountingTransactionRunner } from "./accounting-transaction.runner";
import { toJournalEntryAuditValues } from "./journal-entry-audit.mapper";
import { validateAccountsForJournalLines } from "./journal-entry-account.validation";

export class UpdateJournalEntryService {
  constructor(
    private readonly transactionRunner: IAccountingTransactionRunner,
  ) {}

  async execute(
    params: JournalEntryIdParamInput,
    input: UpdateJournalEntryInput,
  ): Promise<JournalEntryDto> {
    const { id } = parseRequest(JournalEntryIdParamSchema, params);
    const data = parseRequest(UpdateJournalEntrySchema, input);
    const updateData = toUpdateJournalEntryData(data);

    if (updateData.lines !== undefined) {
      try {
        validateJournalLines(updateData.lines);
      } catch (error) {
        if (error instanceof JournalEntryInvariantError) {
          throw new UnprocessableError({
            message: error.message,
            details: { field: error.field },
          });
        }

        throw error;
      }
    }

    return this.transactionRunner.run(
      async ({ accountRepository, journalEntryRepository, auditLogger }) => {
        const existing = await journalEntryRepository.findById(
          toJournalEntryId(id),
        );

        if (existing === null) {
          throw new NotFoundError({
            message: "Journal entry not found",
            details: { id },
          });
        }

        try {
          existing.assertCanUpdate();
          existing.withUpdated(updateData);
        } catch (error) {
          if (error instanceof JournalEntryInvalidStatusError) {
            throw new UnprocessableError({
              message: error.message,
              details: {
                currentStatus: error.currentStatus,
                action: error.action,
              },
            });
          }

          if (error instanceof JournalEntryInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        if (updateData.lines !== undefined) {
          await validateAccountsForJournalLines(
            accountRepository,
            updateData.lines.map((line) => line.accountId),
          );
        }

        const previousValues = toJournalEntryAuditValues(existing);
        const updated = await journalEntryRepository.update(
          existing.id,
          updateData,
        );

        await auditLogger.log({
          module: JOURNAL_ENTRY_MODULE,
          entityName: JOURNAL_ENTRY_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toJournalEntryAuditValues(updated),
        });

        return toJournalEntryDto(updated);
      },
    );
  }
}
