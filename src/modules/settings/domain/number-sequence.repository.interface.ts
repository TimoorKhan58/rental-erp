import type { DocumentSequenceId } from "@/shared/domain/ids";

import type { NumberSequence } from "./number-sequence.entity";
import type { DocumentType } from "./settings.constants";
import type {
  GeneratedNumberResult,
  GenerateNextNumberOptions,
  UpdateNumberSequenceData,
} from "./number-sequence.types";

export interface INumberSequenceRepository {
  findById(id: DocumentSequenceId): Promise<NumberSequence | null>;
  findAll(): Promise<NumberSequence[]>;
  findByDocumentType(documentType: DocumentType): Promise<NumberSequence | null>;
  update(
    id: DocumentSequenceId,
    data: UpdateNumberSequenceData,
  ): Promise<NumberSequence>;
  generateNextNumber(
    documentType: DocumentType,
    options?: GenerateNextNumberOptions,
  ): Promise<GeneratedNumberResult>;
}
