import { describe, expect, it } from "vitest";
import {
  getInvoiceAmountRemainderLabel,
  getInvoicePaymentsEmptyCopy,
} from "./rental-invoice-status.mapper";

describe("getInvoiceAmountRemainderLabel", () => {
  it("does not call a void invoice paid in full", () => {
    expect(
      getInvoiceAmountRemainderLabel({ status: "VOID", balance: 12_000 }),
    ).toBe("Voided");
    expect(
      getInvoiceAmountRemainderLabel({ status: "VOID", balance: 0 }),
    ).toBe("Voided");
  });

  it("does not call a draft invoice paid in full", () => {
    expect(
      getInvoiceAmountRemainderLabel({ status: "DRAFT", balance: 8_500 }),
    ).toBe("Not issued");
  });

  it("labels a settled issued invoice as paid in full", () => {
    expect(
      getInvoiceAmountRemainderLabel({ status: "PAID", balance: 0 }),
    ).toBe("Paid in full");
  });
});

describe("getInvoicePaymentsEmptyCopy", () => {
  it("explains that void invoices cannot accept payments", () => {
    expect(getInvoicePaymentsEmptyCopy({ status: "VOID", balance: 0 })).toBe(
      "This invoice is void. Payments cannot be recorded.",
    );
  });

  it("asks operators to issue drafts before recording payment", () => {
    expect(getInvoicePaymentsEmptyCopy({ status: "DRAFT", balance: 100 })).toBe(
      "Issue this invoice before recording payments.",
    );
  });

  it("states fully paid only for non-void collected invoices", () => {
    expect(getInvoicePaymentsEmptyCopy({ status: "PAID", balance: 0 })).toBe(
      "This invoice is fully paid.",
    );
  });
});
