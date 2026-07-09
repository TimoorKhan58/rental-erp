import { describe, expect, it } from "vitest";

import {
  CreatePurchaseOrderSchema,
  ListPurchaseOrdersSchema,
  ReceivePurchaseOrderSchema,
  UpdatePurchaseOrderSchema,
} from "@/modules/procurement/application";

import {
  PRODUCT_ID,
  SUPPLIER_ID,
  VALID_CREATE_INPUT,
  WAREHOUSE_ID,
} from "../tests/helpers/purchase-order.fixtures";

describe("CreatePurchaseOrderSchema", () => {
  it("accepts valid create input", () => {
    const result = CreatePurchaseOrderSchema.parse(VALID_CREATE_INPUT);

    expect(result.poNumber).toBe("PO-2026-001");
    expect(result.items).toHaveLength(1);
  });

  it("rejects missing items", () => {
    expect(() =>
      CreatePurchaseOrderSchema.parse({ ...VALID_CREATE_INPUT, items: [] }),
    ).toThrow();
  });

  it("rejects invalid supplier id", () => {
    expect(() =>
      CreatePurchaseOrderSchema.parse({
        ...VALID_CREATE_INPUT,
        supplierId: "bad",
      }),
    ).toThrow();
  });

  it("rejects negative unit cost", () => {
    expect(() =>
      CreatePurchaseOrderSchema.parse({
        ...VALID_CREATE_INPUT,
        items: [{ productId: PRODUCT_ID, quantity: 10, unitCost: -1 }],
      }),
    ).toThrow();
  });

  it("rejects invalid warehouse id", () => {
    expect(() =>
      CreatePurchaseOrderSchema.parse({
        ...VALID_CREATE_INPUT,
        warehouseId: "bad",
      }),
    ).toThrow();
  });

  it("accepts null expected date", () => {
    const result = CreatePurchaseOrderSchema.parse({
      ...VALID_CREATE_INPUT,
      expectedDate: null,
    });

    expect(result.expectedDate).toBeNull();
  });
});

describe("UpdatePurchaseOrderSchema items", () => {
  it("accepts item replacement on update", () => {
    const result = UpdatePurchaseOrderSchema.parse({
      items: [{ productId: PRODUCT_ID, quantity: 5, unitCost: 0 }],
    });

    expect(result.items?.[0]?.quantity).toBe(5);
  });

  it("rejects empty items array on update", () => {
    expect(() =>
      UpdatePurchaseOrderSchema.parse({
        items: [],
      }),
    ).toThrow();
  });
});

describe("UpdatePurchaseOrderSchema", () => {
  it("accepts partial update", () => {
    const result = UpdatePurchaseOrderSchema.parse({
      remarks: "Updated remarks",
    });

    expect(result.remarks).toBe("Updated remarks");
  });

  it("rejects empty update payload", () => {
    expect(() => UpdatePurchaseOrderSchema.parse({})).toThrow();
  });
});

describe("ReceivePurchaseOrderSchema", () => {
  it("accepts valid receive input", () => {
    const result = ReceivePurchaseOrderSchema.parse({
      items: [{ productId: PRODUCT_ID, quantity: 10 }],
    });

    expect(result.items[0]?.quantity).toBe(10);
  });

  it("rejects empty receive items", () => {
    expect(() => ReceivePurchaseOrderSchema.parse({ items: [] })).toThrow();
  });
});

describe("ListPurchaseOrdersSchema", () => {
  it("accepts list filters", () => {
    const result = ListPurchaseOrdersSchema.parse({
      page: "1",
      pageSize: "20",
      status: "APPROVED",
      supplierId: SUPPLIER_ID,
      warehouseId: WAREHOUSE_ID,
    });

    expect(result.status).toBe("APPROVED");
  });

  it("rejects search longer than 200 characters", () => {
    expect(() =>
      ListPurchaseOrdersSchema.parse({
        page: "1",
        pageSize: "20",
        search: "x".repeat(201),
      }),
    ).toThrow();
  });
});
