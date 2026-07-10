import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { NumberSequenceDto } from "../dtos/number-sequence.dto";
import {
  toNumberSequenceDto,
  toNumberSequenceId,
} from "../mappers/number-sequence.mapper";
import {
  NumberSequenceIdParamSchema,
  type NumberSequenceIdParamInput,
} from "../schemas/number-sequence.schemas";

export class GetNumberSequenceByIdService {
  constructor(
    private readonly repository: INumberSequenceRepository,
  ) {}

  async execute(params: NumberSequenceIdParamInput): Promise<NumberSequenceDto> {
    const { id } = parseRequest(NumberSequenceIdParamSchema, params);
    const sequence = await this.repository.findById(toNumberSequenceId(id));

    if (sequence === null) {
      throw new NotFoundError({
        message: "Number sequence not found",
        details: { id },
      });
    }

    return toNumberSequenceDto(sequence);
  }
}
