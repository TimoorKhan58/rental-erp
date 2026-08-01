import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import { DEFAULT_SEQUENCE_PADDING_LENGTH } from "@/modules/settings/domain/number-sequence.constants";

/** Historical invoice format: INV-{year}-{n} with minimum 3-digit padding. */
export const RENTAL_INVOICE_SEQUENCE_PADDING = DEFAULT_SEQUENCE_PADDING_LENGTH;

export function buildInvoiceNumberYearPrefix(year: number): string {
  return `INV-${year}-`;
}

/**
 * Allocates the next rental invoice number via DocumentSequence.
 * Uses year-scoped prefixes (`INV-2026-`) with atomic row locking and
 * automatic counter reset on year change.
 */
export async function generateNextInvoiceNumber(
  numberSequences: INumberSequenceRepository,
  referenceDate = new Date(),
): Promise<string> {
  const yearPrefix = buildInvoiceNumberYearPrefix(referenceDate.getFullYear());

  const result = await numberSequences.generateNextNumber("RENTAL_INVOICE", {
    prefix: yearPrefix,
    resetWhenPrefixChanges: true,
    paddingLength: RENTAL_INVOICE_SEQUENCE_PADDING,
  });

  return result.formattedNumber;
}
