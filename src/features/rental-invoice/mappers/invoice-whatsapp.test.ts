import { describe, expect, it } from "vitest";

import {
  buildInvoiceWhatsAppLink,
  buildInvoiceWhatsAppMessage,
  toWhatsAppNumber,
} from "./invoice-whatsapp";

const base = {
  phone: "0300 0000000",
  customerName: "City Events",
  businessName: "MT Service",
  invoiceNumber: "INV-00031",
  orderNumber: "RO-00045",
  total: "PKR 49,400",
  balance: "PKR 49,400",
  balanceIsZero: false,
};

describe("toWhatsAppNumber", () => {
  it.each([
    ["0300 0000000", "923000000000"],
    ["0300-0000000", "923000000000"],
    ["+92 300 0000000", "923000000000"],
    ["92 300 0000000", "923000000000"],
    ["0092 300 0000000", "923000000000"],
    ["300 0000000", "923000000000"],
  ])("%s -> %s", (input, expected) => {
    expect(toWhatsAppNumber(input)).toBe(expected);
  });

  it("returns null when there is no usable number", () => {
    expect(toWhatsAppNumber("")).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
    expect(toWhatsAppNumber("n/a")).toBeNull();
    expect(toWhatsAppNumber("123")).toBeNull();
  });
});

describe("invoice WhatsApp message", () => {
  it("asks for the balance when something is owed", () => {
    const text = buildInvoiceWhatsAppMessage(base);
    expect(text).toContain("Assalam o Alaikum, City Events.");
    expect(text).toContain("Your bill INV-00031 from MT Service for order RO-00045 is ready.");
    expect(text).toContain("Total: PKR 49,400");
    expect(text).toContain("To pay: PKR 49,400");
  });

  it("says paid in full when nothing is owed", () => {
    const text = buildInvoiceWhatsAppMessage({ ...base, balance: "PKR 0", balanceIsZero: true });
    expect(text).toContain("Paid in full. Thank you!");
    expect(text).not.toContain("To pay");
  });

  it("works without an order number", () => {
    const text = buildInvoiceWhatsAppMessage({ ...base, orderNumber: undefined });
    expect(text).toContain("Your bill INV-00031 from MT Service is ready.");
  });

  it("builds a wa.me link with the message encoded", () => {
    const link = buildInvoiceWhatsAppLink(base);
    expect(link).toMatch(/^https:\/\/wa\.me\/923000000000\?text=/);
    const text = decodeURIComponent(link!.split("?text=")[1]!);
    expect(text).toBe(buildInvoiceWhatsAppMessage(base));
  });

  it("gives no link when the customer has no usable phone", () => {
    expect(buildInvoiceWhatsAppLink({ ...base, phone: "" })).toBeNull();
  });
});
