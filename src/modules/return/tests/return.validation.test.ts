import { describe, expect, it } from "vitest";

import {
  CreateReturnSchema,
  InspectReturnSchema,
  ListReturnsSchema,
  RecoverLostReturnSchema,
  UpdateReturnSchema,
} from "@/modules/return/application";

import {
  DISPATCH_ID,
  ITEM_ID,
  RENTAL_ORDER_ID,
  VALID_CREATE_INPUT,
} from "./helpers/return.fixtures";

describe("CreateReturnSchema", () => {
  it("accepts valid create input", () => {
    const result = CreateReturnSchema.parse(VALID_CREATE_INPUT);

    expect(result.returnNumber).toBe("RTN-2026-001");
    expect(result.items).toHaveLength(1);
  });

  it("rejects missing items", () => {
    expect(() =>
      CreateReturnSchema.parse({ ...VALID_CREATE_INPUT, items: [] }),
    ).toThrow();
  });

  it("rejects invalid rental order id", () => {
    expect(() =>
      CreateReturnSchema.parse({
        ...VALID_CREATE_INPUT,
        rentalOrderId: "bad",
      }),
    ).toThrow();
  });

  it("rejects invalid dispatch id", () => {
    expect(() =>
      CreateReturnSchema.parse({
        ...VALID_CREATE_INPUT,
        dispatchId: "bad",
      }),
    ).toThrow();
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      CreateReturnSchema.parse({
        ...VALID_CREATE_INPUT,
        items: [{ rentalOrderItemId: ITEM_ID, quantity: 0 }],
      }),
    ).toThrow();
  });

  it("rejects empty return number", () => {
    expect(() =>
      CreateReturnSchema.parse({
        ...VALID_CREATE_INPUT,
        returnNumber: "",
      }),
    ).toThrow();
  });

  it("accepts null optional fields", () => {
    const result = CreateReturnSchema.parse({
      ...VALID_CREATE_INPUT,
      remarks: null,
      items: [{ rentalOrderItemId: ITEM_ID, quantity: 5, notes: null }],
    });

    expect(result.remarks).toBeNull();
  });
});

describe("UpdateReturnSchema", () => {
  it("accepts item replacement on update", () => {
    const result = UpdateReturnSchema.parse({
      items: [{ rentalOrderItemId: ITEM_ID, quantity: 3 }],
    });

    expect(result.items?.[0]?.quantity).toBe(3);
  });

  it("rejects empty items array on update", () => {
    expect(() =>
      UpdateReturnSchema.parse({
        items: [],
      }),
    ).toThrow();
  });

  it("rejects empty update payload", () => {
    expect(() => UpdateReturnSchema.parse({})).toThrow();
  });

  it("accepts remarks update", () => {
    const result = UpdateReturnSchema.parse({ remarks: "Updated remarks" });

    expect(result.remarks).toBe("Updated remarks");
  });
});

describe("InspectReturnSchema", () => {
  it("accepts valid inspect input", () => {
    const result = InspectReturnSchema.parse({
      items: [
        {
          rentalOrderItemId: ITEM_ID,
          goodQuantity: 3,
          damagedQuantity: 1,
          lostQuantity: 1,
        },
      ],
    });

    expect(result.items[0]?.goodQuantity).toBe(3);
  });

  it("rejects empty items array", () => {
    expect(() => InspectReturnSchema.parse({ items: [] })).toThrow();
  });

  it("rejects negative quantities", () => {
    expect(() =>
      InspectReturnSchema.parse({
        items: [
          {
            rentalOrderItemId: ITEM_ID,
            goodQuantity: -1,
            damagedQuantity: 0,
            lostQuantity: 0,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects invalid rental order item id", () => {
    expect(() =>
      InspectReturnSchema.parse({
        items: [
          {
            rentalOrderItemId: "bad",
            goodQuantity: 5,
            damagedQuantity: 0,
            lostQuantity: 0,
          },
        ],
      }),
    ).toThrow();
  });
});

describe("RecoverLostReturnSchema", () => {
  it("accepts recover input without refund", () => {
    const result = RecoverLostReturnSchema.parse({
      items: [{ rentalOrderItemId: ITEM_ID, quantity: 1 }],
    });

    expect(result.items[0]?.quantity).toBe(1);
    expect(result.refund).toBeUndefined();
  });

  it("accepts recover input with refund", () => {
    const result = RecoverLostReturnSchema.parse({
      items: [{ rentalOrderItemId: ITEM_ID, quantity: 2 }],
      refund: {
        rentalInvoiceId: "aa0e8400-e29b-41d4-a716-446655440099",
        amount: 500,
        paymentNumber: "PAY-REF-1",
      },
    });

    expect(result.refund?.paymentMethod).toBe("CASH");
    expect(result.refund?.amount).toBe(500);
  });

  it("rejects empty recover items", () => {
    expect(() => RecoverLostReturnSchema.parse({ items: [] })).toThrow();
  });
});

describe("ListReturnsSchema", () => {
  it("accepts valid list query", () => {
    const result = ListReturnsSchema.parse({
      page: "1",
      pageSize: "20",
      sortOrder: "desc",
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts status filter", () => {
    const result = ListReturnsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      status: "RECEIVED",
    });

    expect(result.status).toBe("RECEIVED");
  });

  it("accepts rental order filter", () => {
    const result = ListReturnsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      rentalOrderId: RENTAL_ORDER_ID,
    });

    expect(result.rentalOrderId).toBe(RENTAL_ORDER_ID);
  });

  it("accepts dispatch filter", () => {
    const result = ListReturnsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      dispatchId: DISPATCH_ID,
    });

    expect(result.dispatchId).toBe(DISPATCH_ID);
  });

  it("accepts search filter", () => {
    const result = ListReturnsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      search: "RTN-2026",
    });

    expect(result.search).toBe("RTN-2026");
  });

  it("accepts sortBy field", () => {
    const result = ListReturnsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      sortBy: "returnNumber",
    });

    expect(result.sortBy).toBe("returnNumber");
  });
});
