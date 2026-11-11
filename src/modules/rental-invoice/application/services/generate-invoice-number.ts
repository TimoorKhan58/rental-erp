import {
  buildInvoiceNumberPrefix,
  formatInvoiceNumberFromSequence,
} from "@/modules/rental-invoice/domain/rental-invoice-number.rules";
import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";

export async function generateNextInvoiceNumber(
  repository: IRentalInvoiceRepository,
  referenceDate = new Date(),
): Promise<string> {
  const prefix = buildInvoiceNumberPrefix(referenceDate);
  const maxSequence = await repository.findMaxSequenceForInvoicePrefix(prefix);

  return formatInvoiceNumberFromSequence(prefix, maxSequence + 1);
}
