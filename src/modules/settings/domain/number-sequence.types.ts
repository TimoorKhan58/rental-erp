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

/** Optional allocation controls used by year-scoped document numbers. */
export interface GenerateNextNumberOptions {
  /** Override stored prefix for this allocation (e.g. `INV-2026-`). */
  readonly prefix?: string;
  /**
   * When true and `prefix` differs from the stored prefix, reset
   * `currentNumber` to `startingNumber` (year rollover).
   */
  readonly resetWhenPrefixChanges?: boolean;
  /** Padding used when auto-creating a missing sequence row. */
  readonly paddingLength?: number;
}
