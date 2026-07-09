import { describe, expect, it } from "vitest";

import {
  CreateRentalInvoiceSchema,
  UpdateRentalInvoiceSchema,
} from "@/modules/rental-invoice/application/schemas/rental-invoice.schemas";
import { ListRentalInvoicesSchema } from "@/modules/rental-invoice/application/schemas/list-rental-invoices.schema";

import {
  CUSTOMER_ID,
  RENTAL_ORDER_ID,
  VALID_CREATE_INPUT,
} from "./helpers/rental-invoice.fixtures";

describe("CreateRentalInvoiceSchema", () => {
  it("accepts valid create input", () => {
    const result = CreateRentalInvoiceSchema.parse(VALID_CREATE_INPUT);

    expect(result.invoiceNumber).toBe("INV-2026-001");
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.lineType).toBe("RENTAL_CHARGE");
  });

  it("rejects invalid rental order id", () => {
    expect(() =>
      CreateRentalInvoiceSchema.parse({
        ...VALID_CREATE_INPUT,
        rentalOrderId: "bad",
      }),
    ).toThrow();
  });

  it("rejects invalid customer id", () => {
    expect(() =>
      CreateRentalInvoiceSchema.parse({
        ...VALID_CREATE_INPUT,
        customerId: "bad",
      }),
    ).toThrow();
  });

  it("rejects empty invoice number", () => {
    expect(() =>
      CreateRentalInvoiceSchema.parse({
        ...VALID_CREATE_INPUT,
        invoiceNumber: "",
      }),
    ).toThrow();
  });

  it("rejects empty items list", () => {
    expect(() =>
      CreateRentalInvoiceSchema.parse({
        ...VALID_CREATE_INPUT,
        items: [],
      }),
    ).toThrow();
  });

  it("rejects non-positive item quantity", () => {
    expect(() =>
      CreateRentalInvoiceSchema.parse({
        ...VALID_CREATE_INPUT,
        items: [
          {
            lineType: "RENTAL_CHARGE",
            description: "Rental",
            quantity: 0,
            unitPrice: 100,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects negative item unit price", () => {
    expect(() =>
      CreateRentalInvoiceSchema.parse({
        ...VALID_CREATE_INPUT,
        items: [
          {
            lineType: "RENTAL_CHARGE",
            description: "Rental",
            quantity: 1,
            unitPrice: -1,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects invalid line type", () => {
    expect(() =>
      CreateRentalInvoiceSchema.parse({
        ...VALID_CREATE_INPUT,
        items: [
          {
            lineType: "INVALID",
            description: "Rental",
            quantity: 1,
            unitPrice: 100,
          },
        ],
      }),
    ).toThrow();
  });

  it("accepts null optional notes", () => {
    const result = CreateRentalInvoiceSchema.parse({
      ...VALID_CREATE_INPUT,
      notes: null,
    });

    expect(result.notes).toBeNull();
  });

  it("accepts all valid line types", () => {
    for (const lineType of [
      "RENTAL_CHARGE",
      "DELIVERY_CHARGE",
      "PICKUP_CHARGE",
      "DAMAGE_CHARGE",
      "LOST_ITEM_CHARGE",
      "REPAIR_CHARGE",
      "MANUAL_CHARGE",
      "DISCOUNT",
      "TAX",
    ] as const) {
      const result = CreateRentalInvoiceSchema.parse({
        ...VALID_CREATE_INPUT,
        items: [
          {
            lineType,
            description: `${lineType} line`,
            quantity: 1,
            unitPrice: 10,
          },
        ],
      });

      expect(result.items[0]?.lineType).toBe(lineType);
    }
  });

  it("accepts nullable due date", () => {
    const result = CreateRentalInvoiceSchema.parse({
      ...VALID_CREATE_INPUT,
      dueDate: null,
    });

    expect(result.dueDate).toBeNull();
  });
});

describe("UpdateRentalInvoiceSchema", () => {
  it("accepts notes update", () => {
    const result = UpdateRentalInvoiceSchema.parse({ notes: "Updated notes" });

    expect(result.notes).toBe("Updated notes");
  });

  it("accepts items update", () => {
    const result = UpdateRentalInvoiceSchema.parse({
      items: [
        {
          lineType: "RENTAL_CHARGE",
          description: "Updated rental",
          quantity: 1,
          unitPrice: 200,
        },
      ],
    });

    expect(result.items).toHaveLength(1);
  });

  it("rejects empty update payload", () => {
    expect(() => UpdateRentalInvoiceSchema.parse({})).toThrow();
  });

  it("accepts invoice date update", () => {
    const result = UpdateRentalInvoiceSchema.parse({
      invoiceDate: "2026-03-01T00:00:00.000Z",
    });

    expect(result.invoiceDate).toBeInstanceOf(Date);
  });

  it("accepts due date update", () => {
    const result = UpdateRentalInvoiceSchema.parse({
      dueDate: "2026-04-01T00:00:00.000Z",
    });

    expect(result.dueDate).toBeInstanceOf(Date);
  });

  it("rejects non-positive quantity on update", () => {
    expect(() =>
      UpdateRentalInvoiceSchema.parse({
        items: [
          {
            lineType: "RENTAL_CHARGE",
            description: "Rental",
            quantity: 0,
            unitPrice: 100,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects negative unit price on update", () => {
    expect(() =>
      UpdateRentalInvoiceSchema.parse({
        items: [
          {
            lineType: "RENTAL_CHARGE",
            description: "Rental",
            quantity: 1,
            unitPrice: -5,
          },
        ],
      }),
    ).toThrow();
  });
});

describe("ListRentalInvoicesSchema", () => {
  it("accepts valid list query", () => {
    const result = ListRentalInvoicesSchema.parse({
      page: "1",
      pageSize: "20",
      sortOrder: "desc",
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts status filter", () => {
    const result = ListRentalInvoicesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      status: "DRAFT",
    });

    expect(result.status).toBe("DRAFT");
  });

  it("accepts customer filter", () => {
    const result = ListRentalInvoicesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      customerId: CUSTOMER_ID,
    });

    expect(result.customerId).toBe(CUSTOMER_ID);
  });

  it("accepts rental order filter", () => {
    const result = ListRentalInvoicesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      rentalOrderId: RENTAL_ORDER_ID,
    });

    expect(result.rentalOrderId).toBe(RENTAL_ORDER_ID);
  });

  it("accepts search filter", () => {
    const result = ListRentalInvoicesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      search: "INV-2026",
    });

    expect(result.search).toBe("INV-2026");
  });

  it("accepts sortBy field", () => {
    const result = ListRentalInvoicesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      sortBy: "invoiceNumber",
    });

    expect(result.sortBy).toBe("invoiceNumber");
  });

  it("rejects search term exceeding max length", () => {
    expect(() =>
      ListRentalInvoicesSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        search: "x".repeat(201),
      }),
    ).toThrow();
  });

  it("accepts all valid status filters", () => {
    for (const status of [
      "DRAFT",
      "ISSUED",
      "PARTIALLY_PAID",
      "PAID",
      "VOID",
    ] as const) {
      const result = ListRentalInvoicesSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        status,
      });

      expect(result.status).toBe(status);
    }
  });
});
