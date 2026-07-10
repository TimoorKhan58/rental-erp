import type { NumberSequence } from "@/modules/settings/domain/number-sequence.entity";
import type { UpdateNumberSequenceData } from "@/modules/settings/domain/number-sequence.types";
import type { DocumentSequenceId } from "@/shared/domain/ids";

import type { NumberSequenceDto } from "../dtos/number-sequence.dto";
import type { UpdateNumberSequenceInput } from "../schemas/number-sequence.schemas";

export function toNumberSequenceId(id: string): DocumentSequenceId {
  return id as DocumentSequenceId;
}

export function toNumberSequenceDto(
  sequence: NumberSequence,
): NumberSequenceDto {
  const props = sequence.toProps();

  return {
    id: props.id,
    companySettingId: props.companySettingId,
    documentType: props.documentType,
    prefix: props.prefix,
    suffix: props.suffix,
    startingNumber: props.startingNumber,
    currentNumber: props.currentNumber,
    paddingLength: props.paddingLength,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toUpdateNumberSequenceData(
  input: UpdateNumberSequenceInput,
): UpdateNumberSequenceData {
  return {
    prefix: input.prefix,
    suffix: input.suffix,
    startingNumber: input.startingNumber,
    paddingLength: input.paddingLength,
  };
}
