import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import type { DocumentType } from "@/modules/settings/domain/settings.constants";

/**
 * Returns a caller-provided code when present; otherwise allocates the next
 * document number from the company DocumentSequence for the given type.
 */
export async function resolveDocumentCode(
  numberSequences: INumberSequenceRepository,
  documentType: DocumentType,
  provided?: string | null,
): Promise<string> {
  const trimmed = provided?.trim();
  if (trimmed) {
    return trimmed;
  }

  const result = await numberSequences.generateNextNumber(documentType);
  return result.formattedNumber;
}
