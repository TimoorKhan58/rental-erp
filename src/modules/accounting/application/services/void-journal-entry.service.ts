import { JournalEntryInvalidStatusError } from "@/modules/accounting/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { JournalEntryDto } from "../dtos/journal-entry.dto";
import {
  toJournalEntryDto,
  toJournalEntryId,
} from "../mappers/journal-entry.mapper";
import {
  JournalEntryIdParamSchema,
  type JournalEntryIdParamInput,
} from "../schemas/journal-entry.schemas";
import {
  JOURNAL_ENTRY_ENTITY_NAME,
  JOURNAL_ENTRY_MODULE,
} from "./accounting-service.constants";
import type { IAccountingTransactionRunner } from "./accounting-transaction.runner";
import { toJournalEntryAuditValues } from "./journal-entry-audit.mapper";

export class VoidJournalEntryService {
  constructor(
    private readonly transactionRunner: IAccountingTransactionRunner,
  ) {}

  async execute(params: JournalEntryIdParamInput): Promise<JournalEntryDto> {
    const { id } = parseRequest(JournalEntryIdParamSchema, params);

    return this.transactionRunner.run(
      async ({ journalEntryRepository, auditLogger }) => {
        const existing = await journalEntryRepository.findById(
          toJournalEntryId(id),
        );

        if (existing === null) {
          throw new NotFoundError({
            message: "Journal entry not found",
            details: { id },
          });
        }

        let voided;

        try {
          voided = existing.withVoided();
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

          throw error;
        }

        const previousValues = toJournalEntryAuditValues(existing);
        const updated = await journalEntryRepository.updateStatus(existing.id, {
          status: voided.status,
          voidedAt: voided.voidedAt,
        });

        await auditLogger.log({
          module: JOURNAL_ENTRY_MODULE,
          entityName: JOURNAL_ENTRY_ENTITY_NAME,
          recordId: updated.id,
          action: "CANCEL",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toJournalEntryAuditValues(updated),
        });

        return toJournalEntryDto(updated);
      },
    );
  }
}
