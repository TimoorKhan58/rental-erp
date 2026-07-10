import type {
  GenerateNextNumberDto,
  NumberSequenceDto,
} from "@/modules/settings/application/dtos/number-sequence.dto";

export interface NumberSequenceResponse {
  id: string;
  companySettingId: string;
  documentType: NumberSequenceDto["documentType"];
  prefix: string;
  suffix: string | null;
  startingNumber: number;
  currentNumber: number;
  paddingLength: number;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateNextNumberResponse {
  documentNumber: string;
  sequence: NumberSequenceResponse;
}

export interface NumberSequenceListResponse {
  items: NumberSequenceResponse[];
}

export function toNumberSequenceResponse(
  dto: NumberSequenceDto,
): NumberSequenceResponse {
  return {
    id: dto.id,
    companySettingId: dto.companySettingId,
    documentType: dto.documentType,
    prefix: dto.prefix,
    suffix: dto.suffix,
    startingNumber: dto.startingNumber,
    currentNumber: dto.currentNumber,
    paddingLength: dto.paddingLength,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toNumberSequenceListResponse(
  items: NumberSequenceDto[],
): NumberSequenceListResponse {
  return {
    items: items.map(toNumberSequenceResponse),
  };
}

export function toGenerateNextNumberResponse(
  dto: GenerateNextNumberDto,
): GenerateNextNumberResponse {
  return {
    documentNumber: dto.documentNumber,
    sequence: toNumberSequenceResponse(dto.sequence),
  };
}
