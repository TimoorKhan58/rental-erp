import type { Prisma } from "@/generated/prisma/client";
import { NumberSequence } from "@/modules/settings/domain/number-sequence.entity";
import type { DocumentType } from "@/modules/settings/domain/settings.constants";
import type { UpdateNumberSequenceData } from "@/modules/settings/domain/number-sequence.types";
import type { CompanySettingId, DocumentSequenceId } from "@/shared/domain/ids";

export function toNumberSequenceDomain(record: {
  id: string;
  companySettingId: string;
  documentType: DocumentType;
  prefix: string;
  suffix: string | null;
  startingNumber: number;
  currentNumber: number;
  paddingLength: number;
  createdAt: Date;
  updatedAt: Date;
}): NumberSequence {
  return NumberSequence.reconstitute({
    id: record.id as DocumentSequenceId,
    companySettingId: record.companySettingId as CompanySettingId,
    documentType: record.documentType,
    prefix: record.prefix,
    suffix: record.suffix,
    startingNumber: record.startingNumber,
    currentNumber: record.currentNumber,
    paddingLength: record.paddingLength,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toNumberSequenceUpdateInput(
  data: UpdateNumberSequenceData,
): Prisma.DocumentSequenceUpdateInput {
  const update: Prisma.DocumentSequenceUpdateInput = {};

  if (data.prefix !== undefined) {
    update.prefix = data.prefix;
  }

  if (data.suffix !== undefined) {
    update.suffix = data.suffix;
  }

  if (data.startingNumber !== undefined) {
    update.startingNumber = data.startingNumber;
  }

  if (data.currentNumber !== undefined) {
    update.currentNumber = data.currentNumber;
  }

  if (data.paddingLength !== undefined) {
    update.paddingLength = data.paddingLength;
  }

  return update;
}
