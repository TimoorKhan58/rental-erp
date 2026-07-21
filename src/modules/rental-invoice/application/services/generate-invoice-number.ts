import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";

export async function generateNextInvoiceNumber(
  repository: IRentalInvoiceRepository,
  referenceDate = new Date(),
): Promise<string> {
  const year = referenceDate.getFullYear();
  const prefix = `INV-${year}-`;

  const existing = await repository.findPaged({
    page: 1,
    pageSize: 500,
    sortBy: "invoiceNumber",
    sortOrder: "desc",
  });

  const maxSequence = existing.items.reduce((max, invoice) => {
    if (!invoice.invoiceNumber.startsWith(prefix)) {
      return max;
    }

    const sequence = Number.parseInt(invoice.invoiceNumber.slice(prefix.length), 10);
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);

  return `${prefix}${String(maxSequence + 1).padStart(3, "0")}`;
}
