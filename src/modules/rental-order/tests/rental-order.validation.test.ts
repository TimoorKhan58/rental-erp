import { describe, expect, it } from "vitest";

import {
  CreateRentalOrderSchema,
  ListRentalOrdersSchema,
  ReserveRentalOrderSchema,
  UpdateRentalOrderSchema,
} from "@/modules/rental-order/application";

import {
  CUSTOMER_ID,
  PRODUCT_ID,
  VALID_CREATE_INPUT,
  WAREHOUSE_ID,
} from "./helpers/rental-order.fixtures";

describe("CreateRentalOrderSchema", () => {
  it("accepts valid create input", () => {
    const result = CreateRentalOrderSchema.parse(VALID_CREATE_INPUT);

    expect(result.orderNumber).toBe("RO-2026-001");
    expect(result.items).toHaveLength(1);
  });

  it("rejects missing items", () => {
    expect(() =>
      CreateRentalOrderSchema.parse({ ...VALID_CREATE_INPUT, items: [] }),
    ).toThrow();
  });

  it("rejects invalid customer id", () => {
    expect(() =>
      CreateRentalOrderSchema.parse({
        ...VALID_CREATE_INPUT,
        customerId: "bad",
      }),
    ).toThrow();
  });

  it("rejects negative daily rate", () => {
    expect(() =>
      CreateRentalOrderSchema.parse({
        ...VALID_CREATE_INPUT,
        items: [{ productId: PRODUCT_ID, quantity: 10, dailyRate: -1 }],
      }),
    ).toThrow();
  });

  it("rejects invalid warehouse id", () => {
    expect(() =>
      CreateRentalOrderSchema.parse({
        ...VALID_CREATE_INPUT,
        warehouseId: "bad",
      }),
    ).toThrow();
  });

  it("rejects end date before start date", () => {
    expect(() =>
      CreateRentalOrderSchema.parse({
        ...VALID_CREATE_INPUT,
        startDate: "2026-02-05T00:00:00.000Z",
        endDate: "2026-02-01T00:00:00.000Z",
      }),
    ).toThrow();
  });

  it("accepts null remarks", () => {
    const result = CreateRentalOrderSchema.parse({
      ...VALID_CREATE_INPUT,
      remarks: null,
    });

    expect(result.remarks).toBeNull();
  });
});

describe("UpdateRentalOrderSchema items", () => {
  it("accepts item replacement on update", () => {
    const result = UpdateRentalOrderSchema.parse({
      items: [{ productId: PRODUCT_ID, quantity: 5, dailyRate: 100 }],
    });

    expect(result.items?.[0]?.quantity).toBe(5);
  });

  it("rejects empty items array on update", () => {
    expect(() =>
      UpdateRentalOrderSchema.parse({
        items: [],
      }),
    ).toThrow();
  });

  it("rejects empty update payload", () => {
    expect(() => UpdateRentalOrderSchema.parse({})).toThrow();
  });
});

describe("ReserveRentalOrderSchema", () => {
  it("accepts valid reserve input", () => {
    const result = ReserveRentalOrderSchema.parse({
      items: [{ productId: PRODUCT_ID, quantity: 5 }],
    });

    expect(result.items).toHaveLength(1);
  });

  it("rejects empty reserve items", () => {
    expect(() => ReserveRentalOrderSchema.parse({ items: [] })).toThrow();
  });

  it("rejects non-positive reserve quantity", () => {
    expect(() =>
      ReserveRentalOrderSchema.parse({
        items: [{ productId: PRODUCT_ID, quantity: 0 }],
      }),
    ).toThrow();
  });
});

describe("ListRentalOrdersSchema", () => {
  it("accepts valid list query", () => {
    const result = ListRentalOrdersSchema.parse({
      page: "1",
      pageSize: "20",
      sortOrder: "desc",
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts status filter", () => {
    const result = ListRentalOrdersSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      status: "CONFIRMED",
    });

    expect(result.status).toBe("CONFIRMED");
  });

  it("accepts customer and warehouse filters", () => {
    const result = ListRentalOrdersSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      customerId: CUSTOMER_ID,
      warehouseId: WAREHOUSE_ID,
    });

    expect(result.customerId).toBe(CUSTOMER_ID);
    expect(result.warehouseId).toBe(WAREHOUSE_ID);
  });

  it("accepts event date overlap filters", () => {
    const result = ListRentalOrdersSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      eventFrom: "2026-07-01",
      eventTo: "2026-07-31",
    });

    expect(result.eventFrom).toBeInstanceOf(Date);
    expect(result.eventTo).toBeInstanceOf(Date);
  });

  it("rejects eventTo before eventFrom", () => {
    expect(() =>
      ListRentalOrdersSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        eventFrom: "2026-07-31",
        eventTo: "2026-07-01",
      }),
    ).toThrow();
  });
});
