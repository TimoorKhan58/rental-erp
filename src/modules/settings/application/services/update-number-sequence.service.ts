import { NumberSequenceInvariantError } from "@/modules/settings/domain/number-sequence.errors";
import { parseRequest } from "@/shared/application/validation";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { NumberSequenceDto } from "../dtos/number-sequence.dto";
import {
  toNumberSequenceDto,
  toNumberSequenceId,
  toUpdateNumberSequenceData,
} from "../mappers/number-sequence.mapper";
import {
  NumberSequenceIdParamSchema,
  UpdateNumberSequenceSchema,
  type NumberSequenceIdParamInput,
  type UpdateNumberSequenceInput,
} from "../schemas/number-sequence.schemas";
import { toNumberSequenceAuditValues } from "./number-sequence-audit.mapper";
import {
  NUMBER_SEQUENCE_ENTITY_NAME,
  SETTINGS_MODULE,
} from "./settings-service.constants";
import type { INumberSequenceTransactionRunner } from "./number-sequence-transaction.runner";

export class UpdateNumberSequenceService {
  constructor(
    private readonly transactionRunner: INumberSequenceTransactionRunner,
  ) {}

  async execute(
    params: NumberSequenceIdParamInput,
    input: UpdateNumberSequenceInput,
  ): Promise<NumberSequenceDto> {
    const { id } = parseRequest(NumberSequenceIdParamSchema, params);
    const data = parseRequest(UpdateNumberSequenceSchema, input);
    const sequenceId = toNumberSequenceId(id);
    const updateData = toUpdateNumberSequenceData(data);

    return this.transactionRunner.run(
      async ({ numberSequenceRepository, auditLogger }) => {
        const existing = await numberSequenceRepository.findById(sequenceId);

        if (existing === null) {
          throw new NotFoundError({
            message: "Number sequence not found",
            details: { id },
          });
        }

        try {
          existing.withUpdated(updateData);
        } catch (error) {
          if (error instanceof NumberSequenceInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const previousValues = toNumberSequenceAuditValues(existing);
        const updated = await numberSequenceRepository.update(
          sequenceId,
          updateData,
        );

        await auditLogger.log({
          module: SETTINGS_MODULE,
          entityName: NUMBER_SEQUENCE_ENTITY_NAME,
          recordId: updated.id,
          action: "UPDATE",
          status: "SUCCESS",
          oldValues: previousValues,
          newValues: toNumberSequenceAuditValues(updated),
        });

        return toNumberSequenceDto(updated);
      },
    );
  }
}
