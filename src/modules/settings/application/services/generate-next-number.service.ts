import {
  NumberSequenceInvariantError,
  NumberSequenceNotFoundError,
} from "@/modules/settings/domain/number-sequence.errors";
import { SettingsNotFoundError } from "@/modules/settings/domain/settings.errors";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { GenerateNextNumberDto } from "../dtos/number-sequence.dto";
import {
  toNumberSequenceDto,
  toNumberSequenceId,
} from "../mappers/number-sequence.mapper";
import {
  NumberSequenceIdParamSchema,
  type NumberSequenceIdParamInput,
} from "../schemas/number-sequence.schemas";
import { toNumberSequenceAuditValues } from "./number-sequence-audit.mapper";
import {
  NUMBER_SEQUENCE_ENTITY_NAME,
  SETTINGS_MODULE,
} from "./settings-service.constants";
import type { INumberSequenceTransactionRunner } from "./number-sequence-transaction.runner";

export class GenerateNextNumberService {
  constructor(
    private readonly transactionRunner: INumberSequenceTransactionRunner,
  ) {}

  async execute(
    params: NumberSequenceIdParamInput,
  ): Promise<GenerateNextNumberDto> {
    const { id } = parseRequest(NumberSequenceIdParamSchema, params);
    const sequenceId = toNumberSequenceId(id);

    return this.transactionRunner.run(
      async ({ numberSequenceRepository, auditLogger }) => {
        const existing = await numberSequenceRepository.findById(sequenceId);

        if (existing === null) {
          throw new NotFoundError({
            message: "Number sequence not found",
            details: { id },
          });
        }

        const previousValues = toNumberSequenceAuditValues(existing);

        try {
          const result = await numberSequenceRepository.generateNextNumber(
            existing.documentType,
          );

          await auditLogger.log({
            module: SETTINGS_MODULE,
            entityName: NUMBER_SEQUENCE_ENTITY_NAME,
            recordId: result.sequence.id,
            action: "UPDATE",
            status: "SUCCESS",
            oldValues: previousValues,
            newValues: toNumberSequenceAuditValues(result.sequence),
          });

          return {
            documentNumber: result.formattedNumber,
            sequence: toNumberSequenceDto(result.sequence),
          };
        } catch (error) {
          if (error instanceof NumberSequenceInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          if (error instanceof NumberSequenceNotFoundError) {
            throw new NotFoundError({
              message: error.message,
              details: { documentType: existing.documentType },
            });
          }

          if (error instanceof SettingsNotFoundError) {
            throw new NotFoundError({
              message: error.message,
            });
          }

          throw error;
        }
      },
    );
  }
}
