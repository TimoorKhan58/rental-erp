import { describe, expect, it } from "vitest";

import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import { RentalInvoiceItem } from "@/modules/rental-invoice/domain/rental-invoice-item.entity";
import {
  RentalInvoiceInvalidStatusError,
  RentalInvoiceInvariantError,
  createInvoiceNumber,
} from "@/modules/rental-invoice/domain/rental-invoice.errors";
import {
  computeInvoiceTotals,
  computeLineTotalAmount,
  validateRentalInvoiceItems,
} from "@/modules/rental-invoice/domain/rental-invoice.rules";

import {
  buildCreateRentalInvoiceData,
  buildIssuedRentalInvoiceEntity,
  buildPaidRentalInvoiceEntity,
  buildRentalInvoiceEntity,
  buildVoidRentalInvoiceEntity,
} from "../tests/helpers/rental-invoice.fixtures";

describe("RentalInvoice entity", () => {
  it("creates normalized rental invoice props", () => {
    const props = RentalInvoice.create(buildCreateRentalInvoiceData());

    expect(props.invoiceNumber).toBe("INV-2026-001");
    expect(props.status).toBe("DRAFT");
    expect(props.subtotal).toBe(350);
    expect(props.grandTotal).toBe(350);
  });

  it("rejects empty invoice number", () => {
    expect(() =>
      RentalInvoice.create(
        buildCreateRentalInvoiceData({ invoiceNumber: "   " }),
      ),
    ).toThrow(RentalInvoiceInvariantError);
  });

  it("rejects empty items list", () => {
    expect(() =>
      RentalInvoice.create(buildCreateRentalInvoiceData({ items: [] })),
    ).toThrow(RentalInvoiceInvariantError);
  });

  it("rejects non-positive item quantity", () => {
    expect(() =>
      RentalInvoice.create(
        buildCreateRentalInvoiceData({
          items: [
            {
              lineType: "RENTAL_CHARGE",
              description: "Tent rental",
              quantity: 0,
              unitPrice: 100,
            },
          ],
        }),
      ),
    ).toThrow(RentalInvoiceInvariantError);
  });

  it("rejects negative item unit price", () => {
    expect(() =>
      RentalInvoice.create(
        buildCreateRentalInvoiceData({
          items: [
            {
              lineType: "RENTAL_CHARGE",
              description: "Tent rental",
              quantity: 1,
              unitPrice: -1,
            },
          ],
        }),
      ),
    ).toThrow(RentalInvoiceInvariantError);
  });

  it("rejects empty item description", () => {
    expect(() =>
      RentalInvoice.create(
        buildCreateRentalInvoiceData({
          items: [
            {
              lineType: "RENTAL_CHARGE",
              description: "   ",
              quantity: 1,
              unitPrice: 100,
            },
          ],
        }),
      ),
    ).toThrow(RentalInvoiceInvariantError);
  });

  it("reconstitutes persisted rental invoice", () => {
    const invoice = buildRentalInvoiceEntity();

    expect(invoice.toProps().invoiceNumber).toBe("INV-2026-001");
    expect(invoice.items).toHaveLength(2);
  });

  it("normalizes optional notes to null", () => {
    const props = RentalInvoice.create(
      buildCreateRentalInvoiceData({ notes: "   " }),
    );

    expect(props.notes).toBeNull();
  });

  it("updates draft invoice fields", () => {
    const invoice = buildRentalInvoiceEntity();
    const updated = invoice.withUpdated({
      notes: "Updated notes",
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: "Updated rental charge",
          quantity: 2,
          unitPrice: 200,
        },
      ],
    });

    expect(updated.notes).toBe("Updated notes");
    expect(updated.subtotal).toBe(400);
    expect(updated.grandTotal).toBe(400);
  });

  it("rejects update when not draft", () => {
    const invoice = buildIssuedRentalInvoiceEntity();

    expect(() => invoice.withUpdated({ notes: "Updated" })).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });

  it("issues draft invoice", () => {
    const invoice = buildRentalInvoiceEntity();
    const issued = invoice.withIssued();

    expect(issued.status).toBe("ISSUED");
    expect(issued.issuedAt).not.toBeNull();
  });

  it("rejects issue when not draft", () => {
    const invoice = buildIssuedRentalInvoiceEntity();

    expect(() => invoice.withIssued()).toThrow(RentalInvoiceInvalidStatusError);
  });

  it("voids issued invoice", () => {
    const invoice = buildIssuedRentalInvoiceEntity();
    const voided = invoice.withVoided();

    expect(voided.status).toBe("VOID");
    expect(voided.voidedAt).not.toBeNull();
  });

  it("rejects void when paid", () => {
    const invoice = buildPaidRentalInvoiceEntity();

    expect(() => invoice.withVoided()).toThrow(RentalInvoiceInvalidStatusError);
  });

  it("rejects void when already void", () => {
    const invoice = buildVoidRentalInvoiceEntity();

    expect(() => invoice.withVoided()).toThrow(RentalInvoiceInvalidStatusError);
  });

  it("applies partial payment to issued invoice", () => {
    const invoice = buildIssuedRentalInvoiceEntity();
    const partiallyPaid = invoice.withPaymentApplied(100);

    expect(partiallyPaid.status).toBe("PARTIALLY_PAID");
    expect(partiallyPaid.paidAmount).toBe(100);
    expect(partiallyPaid.balance).toBe(invoice.grandTotal - 100);
  });

  it("applies full payment and marks invoice paid", () => {
    const invoice = buildIssuedRentalInvoiceEntity();
    const paid = invoice.withPaymentApplied(invoice.grandTotal);

    expect(paid.status).toBe("PAID");
    expect(paid.balance).toBe(0);
  });

  it("rejects payment on draft invoice", () => {
    const invoice = buildRentalInvoiceEntity();

    expect(() => invoice.withPaymentApplied(100)).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });

  it("rejects payment on void invoice", () => {
    const invoice = buildVoidRentalInvoiceEntity();

    expect(() => invoice.withPaymentApplied(100)).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });

  it("assertCanUpdate allows draft only", () => {
    expect(() => buildRentalInvoiceEntity().assertCanUpdate()).not.toThrow();
    expect(() => buildIssuedRentalInvoiceEntity().assertCanUpdate()).toThrow(
      RentalInvoiceInvalidStatusError,
    );
  });
});

describe("RentalInvoice totals", () => {
  const emptyBill = {
    productName: null,
    dailyRate: null,
    numberOfDays: null,
    damagedQuantity: 0,
    lostQuantity: 0,
    missingQuantity: 0,
    notes: null,
  } as const;

  it("computes subtotal from charge line types", () => {
    const totals = computeInvoiceTotals([
      {
        id: "1",
        lineType: "RENTAL_CHARGE",
        description: "Rental",
        quantity: 2,
        unitPrice: 100,
        lineTotal: 200,
        sortOrder: 0,
        ...emptyBill,
      },
      {
        id: "2",
        lineType: "DELIVERY_CHARGE",
        description: "Delivery",
        quantity: 1,
        unitPrice: 50,
        lineTotal: 50,
        sortOrder: 1,
        ...emptyBill,
      },
    ]);

    expect(totals.subtotal).toBe(250);
    expect(totals.discount).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.grandTotal).toBe(250);
  });

  it("computes discount from DISCOUNT lines", () => {
    const totals = computeInvoiceTotals([
      {
        id: "1",
        lineType: "RENTAL_CHARGE",
        description: "Rental",
        quantity: 1,
        unitPrice: 500,
        lineTotal: 500,
        sortOrder: 0,
        ...emptyBill,
      },
      {
        id: "2",
        lineType: "DISCOUNT",
        description: "Promo",
        quantity: 1,
        unitPrice: 50,
        lineTotal: 50,
        sortOrder: 1,
        ...emptyBill,
      },
    ]);

    expect(totals.subtotal).toBe(500);
    expect(totals.discount).toBe(50);
    expect(totals.grandTotal).toBe(450);
  });

  it("computes tax from TAX lines", () => {
    const totals = computeInvoiceTotals([
      {
        id: "1",
        lineType: "RENTAL_CHARGE",
        description: "Rental",
        quantity: 1,
        unitPrice: 100,
        lineTotal: 100,
        sortOrder: 0,
        ...emptyBill,
      },
      {
        id: "2",
        lineType: "TAX",
        description: "Sales tax",
        quantity: 1,
        unitPrice: 10,
        lineTotal: 10,
        sortOrder: 1,
        ...emptyBill,
      },
    ]);

    expect(totals.tax).toBe(10);
    expect(totals.grandTotal).toBe(110);
  });

  it("computes balance as grandTotal minus paidAmount", () => {
    const totals = computeInvoiceTotals(
      [
        {
          id: "1",
          lineType: "RENTAL_CHARGE",
          description: "Rental",
          quantity: 1,
          unitPrice: 200,
          lineTotal: 200,
          sortOrder: 0,
          ...emptyBill,
        },
      ],
      75,
    );

    expect(totals.balance).toBe(125);
  });

  it("rejects negative grand total when discount exceeds charges", () => {
    expect(() =>
      computeInvoiceTotals([
        {
          id: "1",
          lineType: "RENTAL_CHARGE",
          description: "Rental",
          quantity: 1,
          unitPrice: 50,
          lineTotal: 50,
          sortOrder: 0,
          ...emptyBill,
        },
        {
          id: "2",
          lineType: "DISCOUNT",
          description: "Large discount",
          quantity: 1,
          unitPrice: 100,
          lineTotal: 100,
          sortOrder: 1,
          ...emptyBill,
        },
      ]),
    ).toThrow(RentalInvoiceInvariantError);
  });

  it("rejects negative paid amount", () => {
    expect(() =>
      computeInvoiceTotals(
        [
          {
            id: "1",
            lineType: "RENTAL_CHARGE",
            description: "Rental",
            quantity: 1,
            unitPrice: 100,
            lineTotal: 100,
            sortOrder: 0,
            ...emptyBill,
          },
        ],
        -1,
      ),
    ).toThrow(RentalInvoiceInvariantError);
  });
});

describe("RentalInvoiceItem", () => {
  it("creates item with computed line total", () => {
    const item = RentalInvoiceItem.create({
      lineType: "RENTAL_CHARGE",
      description: "Tent rental",
      quantity: 3,
      unitPrice: 100,
      sortOrder: 0,
      productName: null,
      dailyRate: null,
      numberOfDays: null,
      damagedQuantity: 0,
      lostQuantity: 0,
      missingQuantity: 0,
      notes: null,
    });

    expect(item.lineTotal).toBe(300);
  });

  it("creates product bill row with days and condition charges", () => {
    const item = RentalInvoiceItem.create({
      lineType: "RENTAL_CHARGE",
      description: "Banquet Chair",
      quantity: 10,
      unitPrice: 45,
      sortOrder: 0,
      productName: "Banquet Chair",
      dailyRate: 45,
      numberOfDays: 2,
      damagedQuantity: 2,
      lostQuantity: 1,
      missingQuantity: 0,
      notes: "Damage ×2, Lost ×1",
      lineTotal: 10 * 45 * 2 + 2 * 45 * 2 + 1 * 45 * 5,
    });

    expect(item.productName).toBe("Banquet Chair");
    expect(item.numberOfDays).toBe(2);
    expect(item.lineTotal).toBe(1125);
  });

  it("validates items with indexed field errors", () => {
    expect(() =>
      validateRentalInvoiceItems([
        {
          lineType: "RENTAL_CHARGE",
          description: "Valid",
          quantity: 1,
          unitPrice: 100,
        },
        {
          lineType: "RENTAL_CHARGE",
          description: "Invalid",
          quantity: 0,
          unitPrice: 100,
        },
      ]),
    ).toThrow(RentalInvoiceInvariantError);
  });
});

describe("createInvoiceNumber", () => {
  it("accepts valid invoice number", () => {
    expect(createInvoiceNumber("INV-001")).toBe("INV-001");
  });

  it("trims invoice number", () => {
    expect(createInvoiceNumber("  INV-002  ")).toBe("INV-002");
  });

  it("rejects empty invoice number", () => {
    expect(() => createInvoiceNumber("  ")).toThrow(RentalInvoiceInvariantError);
  });
});

describe("computeLineTotalAmount", () => {
  it("multiplies quantity by unit price", () => {
    expect(computeLineTotalAmount(3, 100)).toBe(300);
  });
});
