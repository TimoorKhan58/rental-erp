import { describe, expect, it } from "vitest";
import { deriveRentalOrderBillingPresentation } from "./rental-order-billing.mapper";
import type { RentalInvoiceResponse } from "../types";

function invoice(overrides: Partial<RentalInvoiceResponse> = {}): RentalInvoiceResponse {
  return {
    id: "inv-1",
    invoiceNumber: "INV-001",
    rentalOrderId: "ord-1",
    customerId: "cust-1",
    status: "DRAFT",
    invoiceDate: "2026-01-01",
    dueDate: null,
    subtotal: 100,
    discount: 0,
    tax: 0,
    grandTotal: 100,
    paidAmount: 0,
    balance: 100,
    items: [],
    notes: null,
    issuedAt: null,
    voidedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("deriveRentalOrderBillingPresentation", () => {
  it("blocks generate for non-completed rental orders with domain-aligned copy", () => {
    const result = deriveRentalOrderBillingPresentation({
      rentalOrderStatus: "ON_RENT",
      canGenerate: false,
      canCreate: true,
      activeInvoice: undefined,
    });

    expect(result.state).toBe("no_invoice_pending_completion");
    expect(result.showGenerateAction).toBe(false);
    expect(result.statusDescription).toContain("Completed");
    expect(result.nextStep).toMatch(/Completed/i);
  });

  it("offers generate when gate open and user can create", () => {
    const result = deriveRentalOrderBillingPresentation({
      rentalOrderStatus: "COMPLETED",
      canGenerate: true,
      canCreate: true,
      activeInvoice: undefined,
    });

    expect(result.state).toBe("no_invoice_ready");
    expect(result.showGenerateAction).toBe(true);
  });

  it("describes existing draft invoice and next step to issue", () => {
    const result = deriveRentalOrderBillingPresentation({
      rentalOrderStatus: "COMPLETED",
      canGenerate: true,
      canCreate: true,
      activeInvoice: invoice({ status: "DRAFT" }),
    });

    expect(result.state).toBe("invoice_exists");
    expect(result.showGenerateAction).toBe(false);
    expect(result.nextStep).toMatch(/issue/i);
  });

  it("describes issued partially paid invoice", () => {
    const result = deriveRentalOrderBillingPresentation({
      rentalOrderStatus: "COMPLETED",
      canGenerate: false,
      canCreate: true,
      activeInvoice: invoice({
        status: "PARTIALLY_PAID",
        paidAmount: 40,
        balance: 60,
      }),
    });

    expect(result.state).toBe("invoice_exists");
    expect(result.statusLabel).toContain("Partially paid");
  });

  it("handles cancelled rental orders", () => {
    const result = deriveRentalOrderBillingPresentation({
      rentalOrderStatus: "CANCELLED",
      canGenerate: false,
      canCreate: true,
      activeInvoice: undefined,
    });

    expect(result.state).toBe("cancelled");
    expect(result.showGenerateAction).toBe(false);
  });
});
