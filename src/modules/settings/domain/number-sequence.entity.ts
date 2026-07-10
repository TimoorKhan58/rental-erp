import type { DocumentSequenceId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import {
  DEFAULT_SEQUENCE_PADDING_LENGTH,
  DEFAULT_SEQUENCE_STARTING_NUMBER,
  DOCUMENT_TYPE_PREFIXES,
} from "./number-sequence.constants";
import type { DocumentType } from "./settings.constants";
import {
  assertValidSequenceConfig,
  formatDocumentNumber,
  normalizeNumberSequenceProps,
  normalizeSequencePrefix,
  normalizeSequenceSuffix,
} from "./number-sequence.rules";
import type {
  NumberSequenceProps,
  UpdateNumberSequenceData,
} from "./number-sequence.types";

export interface CreateNumberSequenceData {
  readonly companySettingId: NumberSequenceProps["companySettingId"];
  readonly documentType: DocumentType;
  readonly prefix?: string;
  readonly suffix?: string | null;
  readonly startingNumber?: number;
  readonly currentNumber?: number;
  readonly paddingLength?: number;
}

export class NumberSequence implements Entity<DocumentSequenceId> {
  readonly id: DocumentSequenceId;
  readonly companySettingId: NumberSequenceProps["companySettingId"];
  readonly documentType: DocumentType;
  readonly prefix: string;
  readonly suffix: string | null;
  readonly startingNumber: number;
  readonly currentNumber: number;
  readonly paddingLength: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: NumberSequenceProps) {
    const normalized = normalizeNumberSequenceProps(props);

    this.id = normalized.id;
    this.companySettingId = normalized.companySettingId;
    this.documentType = normalized.documentType;
    this.prefix = normalized.prefix;
    this.suffix = normalized.suffix;
    this.startingNumber = normalized.startingNumber;
    this.currentNumber = normalized.currentNumber;
    this.paddingLength = normalized.paddingLength;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateNumberSequenceData,
  ): Omit<NumberSequenceProps, "id" | "createdAt" | "updatedAt"> {
    const startingNumber = data.startingNumber ?? DEFAULT_SEQUENCE_STARTING_NUMBER;
    const paddingLength = data.paddingLength ?? DEFAULT_SEQUENCE_PADDING_LENGTH;
    const prefix = normalizeSequencePrefix(
      data.prefix ?? DOCUMENT_TYPE_PREFIXES[data.documentType],
    );
    const suffix = normalizeSequenceSuffix(data.suffix);
    const currentNumber = data.currentNumber ?? startingNumber;

    assertValidSequenceConfig({
      prefix,
      startingNumber,
      currentNumber,
      paddingLength,
    });

    return {
      companySettingId: data.companySettingId,
      documentType: data.documentType,
      prefix,
      suffix,
      startingNumber,
      currentNumber,
      paddingLength,
    };
  }

  static reconstitute(props: NumberSequenceProps): NumberSequence {
    return new NumberSequence(props);
  }

  toProps(): NumberSequenceProps {
    return {
      id: this.id,
      companySettingId: this.companySettingId,
      documentType: this.documentType,
      prefix: this.prefix,
      suffix: this.suffix,
      startingNumber: this.startingNumber,
      currentNumber: this.currentNumber,
      paddingLength: this.paddingLength,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  formatNumber(number: number = this.currentNumber): string {
    return formatDocumentNumber(
      this.prefix,
      number,
      this.paddingLength,
      this.suffix,
    );
  }

  withUpdated(data: UpdateNumberSequenceData): NumberSequence {
    const prefix =
      data.prefix !== undefined
        ? normalizeSequencePrefix(data.prefix)
        : this.prefix;
    const suffix =
      data.suffix !== undefined
        ? normalizeSequenceSuffix(data.suffix)
        : this.suffix;
    const startingNumber = data.startingNumber ?? this.startingNumber;
    const currentNumber = data.currentNumber ?? this.currentNumber;
    const paddingLength = data.paddingLength ?? this.paddingLength;

    assertValidSequenceConfig({
      prefix,
      startingNumber,
      currentNumber,
      paddingLength,
    });

    return NumberSequence.reconstitute({
      ...this.toProps(),
      prefix,
      suffix,
      startingNumber,
      currentNumber,
      paddingLength,
      updatedAt: new Date(),
    });
  }

  withNextNumber(number: number): NumberSequence {
    assertValidSequenceConfig({
      prefix: this.prefix,
      startingNumber: this.startingNumber,
      currentNumber: number,
      paddingLength: this.paddingLength,
    });

    return NumberSequence.reconstitute({
      ...this.toProps(),
      currentNumber: number + 1,
      updatedAt: new Date(),
    });
  }
}
