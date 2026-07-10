import type { DocumentType } from "@/modules/settings/domain/settings.constants";

export interface NumberSequenceDto {
  id: string;
  companySettingId: string;
  documentType: DocumentType;
  prefix: string;
  suffix: string | null;
  startingNumber: number;
  currentNumber: number;
  paddingLength: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNumberSequenceDto {
  prefix?: string;
  suffix?: string | null;
  startingNumber?: number;
  paddingLength?: number;
}

export interface NumberSequenceIdParamDto {
  id: string;
}

export interface GenerateNextNumberDto {
  documentNumber: string;
  sequence: NumberSequenceDto;
}
