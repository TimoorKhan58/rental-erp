import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";

import type { NumberSequenceDto } from "../dtos/number-sequence.dto";
import { toNumberSequenceDto } from "../mappers/number-sequence.mapper";

export class ListNumberSequencesService {
  constructor(
    private readonly repository: INumberSequenceRepository,
  ) {}

  async execute(): Promise<NumberSequenceDto[]> {
    const sequences = await this.repository.findAll();
    return sequences.map(toNumberSequenceDto);
  }
}
