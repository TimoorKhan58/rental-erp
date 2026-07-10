import type { CompanySettingId, DocumentSequenceId } from "@/shared/domain/ids";

import type { NumberSequence } from "./number-sequence.entity";
import type { DocumentType } from "./settings.constants";

export interface NumberSequenceProps {
  readonly id: DocumentSequenceId;
  readonly companySettingId: CompanySettingId;
  readonly documentType: DocumentType;
  readonly prefix: string;
  readonly suffix: string | null;
  readonly startingNumber: number;
  readonly currentNumber: number;
  readonly paddingLength: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UpdateNumberSequenceData {
  readonly prefix?: string;
  readonly suffix?: string | null;
  readonly startingNumber?: number;
  readonly currentNumber?: number;
  readonly paddingLength?: number;
}

export interface GeneratedNumberResult {
  readonly sequence: NumberSequence;
  readonly formattedNumber: string;
  readonly number: number;
}
