export function buildInvoiceNumberPrefix(referenceDate: Date): string {
  return `INV-${referenceDate.getFullYear()}-`;
}

export function parseInvoiceNumberSequence(
  invoiceNumber: string,
  prefix: string,
): number | null {
  if (!invoiceNumber.startsWith(prefix)) {
    return null;
  }

  const suffix = invoiceNumber.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) {
    return null;
  }

  const sequence = Number.parseInt(suffix, 10);
  return Number.isFinite(sequence) ? sequence : null;
}

export function formatInvoiceNumberFromSequence(
  prefix: string,
  sequence: number,
): string {
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}
