/**
 * "Send on WhatsApp" for an invoice (UI redesign). Nothing is sent by the
 * system: this builds a wa.me link that opens the owner's own WhatsApp with
 * the message already typed, and they press send themselves.
 */

/**
 * WhatsApp wants the number with country code and no symbols. Pakistani
 * numbers are usually saved as 03xx xxxxxxx, so a leading 0 becomes 92.
 * Returns null when there are too few digits to be a phone number.
 */
export function toWhatsAppNumber(phone: string | null | undefined, countryCode = "92"): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `${countryCode}${digits.slice(1)}`;
  if (digits.startsWith(countryCode)) return digits;
  return `${countryCode}${digits}`;
}

export type InvoiceWhatsAppInput = {
  phone: string | null | undefined;
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  orderNumber?: string;
  /** Already formatted, e.g. "PKR 49,400". */
  total: string;
  /** Already formatted. When it is zero the message says the bill is paid. */
  balance: string;
  balanceIsZero: boolean;
};

export function buildInvoiceWhatsAppMessage(input: InvoiceWhatsAppInput): string {
  const lines = [
    `Assalam o Alaikum, ${input.customerName}.`,
    input.orderNumber
      ? `Your bill ${input.invoiceNumber} from ${input.businessName} for order ${input.orderNumber} is ready.`
      : `Your bill ${input.invoiceNumber} from ${input.businessName} is ready.`,
    "",
    `Total: ${input.total}`,
    input.balanceIsZero ? "Paid in full. Thank you!" : `To pay: ${input.balance}`,
  ];
  if (!input.balanceIsZero) {
    lines.push("", "Thank you!");
  }
  return lines.join("\n");
}

/** A wa.me link with the message filled in, or null when there is no usable number. */
export function buildInvoiceWhatsAppLink(input: InvoiceWhatsAppInput): string | null {
  const number = toWhatsAppNumber(input.phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildInvoiceWhatsAppMessage(input))}`;
}
