import {
  DEFAULT_SEQUENCE_PADDING_LENGTH,
  DEFAULT_SEQUENCE_STARTING_NUMBER,
  DOCUMENT_TYPE_PREFIXES,
} from "@/modules/settings/domain/number-sequence.constants";
import { NumberSequence } from "@/modules/settings/domain/number-sequence.entity";
import { NumberSequenceNotFoundError } from "@/modules/settings/domain/number-sequence.errors";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import {
  assertCanGenerate,
  formatDocumentNumber,
} from "@/modules/settings/domain/number-sequence.rules";
import type {
  GeneratedNumberResult,
  GenerateNextNumberOptions,
  UpdateNumberSequenceData,
} from "@/modules/settings/domain/number-sequence.types";
import type { DocumentType } from "@/modules/settings/domain/settings.constants";
import type { CompanySettingId, DocumentSequenceId } from "@/shared/domain/ids";

interface StoredSequence {
  record: ReturnType<NumberSequence["toProps"]>;
}

/**
 * In-memory DocumentSequence double with per-type mutex (simulates FOR UPDATE).
 */
export class InMemoryNumberSequenceRepository implements INumberSequenceRepository {
  private readonly store = new Map<string, StoredSequence>();
  private readonly lockTails = new Map<string, Promise<void>>();
  private readonly lockReleases = new Map<string, () => void>();
  private readonly companySettingId =
    "aa0e8400-e29b-41d4-a716-446655440099" as CompanySettingId;

  seed(sequences: NumberSequence[]): void {
    this.store.clear();
    for (const sequence of sequences) {
      const props = sequence.toProps();
      this.store.set(props.documentType, { record: props });
    }
  }

  findById(id: DocumentSequenceId): Promise<NumberSequence | null> {
    for (const stored of this.store.values()) {
      if (stored.record.id === id) {
        return Promise.resolve(NumberSequence.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  findAll(): Promise<NumberSequence[]> {
    return Promise.resolve(
      Array.from(this.store.values()).map((stored) =>
        NumberSequence.reconstitute(stored.record),
      ),
    );
  }

  findByDocumentType(documentType: DocumentType): Promise<NumberSequence | null> {
    const stored = this.store.get(documentType);
    return Promise.resolve(
      stored ? NumberSequence.reconstitute(stored.record) : null,
    );
  }

  async update(
    id: DocumentSequenceId,
    data: UpdateNumberSequenceData,
  ): Promise<NumberSequence> {
    for (const [key, stored] of this.store.entries()) {
      if (stored.record.id !== id) {
        continue;
      }

      const updated = NumberSequence.reconstitute(stored.record).withUpdated(data);
      this.store.set(key, { record: updated.toProps() });
      return updated;
    }

    throw new Error("Number sequence not found");
  }

  async generateNextNumber(
    documentType: DocumentType,
    options?: GenerateNextNumberOptions,
  ): Promise<GeneratedNumberResult> {
    await this.acquireLock(documentType);

    try {
      const createPrefix =
        options?.prefix ?? DOCUMENT_TYPE_PREFIXES[documentType];
      const createPadding =
        options?.paddingLength ?? DEFAULT_SEQUENCE_PADDING_LENGTH;

      let stored = this.store.get(documentType);

      if (stored === undefined) {
        const created = NumberSequence.create({
          companySettingId: this.companySettingId,
          documentType,
          prefix: createPrefix,
          startingNumber: DEFAULT_SEQUENCE_STARTING_NUMBER,
          currentNumber: DEFAULT_SEQUENCE_STARTING_NUMBER,
          paddingLength: createPadding,
        });
        const now = new Date();
        const id = crypto.randomUUID() as DocumentSequenceId;
        stored = {
          record: {
            id,
            ...created,
            createdAt: now,
            updatedAt: now,
          },
        };
        this.store.set(documentType, stored);
      }

      let prefix = stored.record.prefix;
      let currentNumber = stored.record.currentNumber;

      if (
        options?.prefix !== undefined &&
        options.resetWhenPrefixChanges === true &&
        stored.record.prefix !== options.prefix
      ) {
        prefix = options.prefix;
        currentNumber = stored.record.startingNumber;
      }

      assertCanGenerate({
        prefix,
        startingNumber: stored.record.startingNumber,
        currentNumber,
        paddingLength: stored.record.paddingLength,
      });

      const number = currentNumber;
      const formattedNumber = formatDocumentNumber(
        prefix,
        number,
        stored.record.paddingLength,
        stored.record.suffix,
      );

      const nextRecord = {
        ...stored.record,
        prefix,
        currentNumber: number + 1,
        updatedAt: new Date(),
      };
      this.store.set(documentType, { record: nextRecord });

      return {
        sequence: NumberSequence.reconstitute(nextRecord),
        formattedNumber,
        number,
      };
    } finally {
      this.releaseLock(documentType);
    }
  }

  private async acquireLock(documentType: string): Promise<void> {
    const previous = this.lockTails.get(documentType) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.lockTails.set(
      documentType,
      previous.then(() => gate),
    );
    await previous;
    this.lockReleases.set(documentType, release);
  }

  private releaseLock(documentType: string): void {
    const release = this.lockReleases.get(documentType);
    if (release !== undefined) {
      this.lockReleases.delete(documentType);
      release();
    }
  }
}
