import { describe, expect, it } from "vitest";

import {
  CreateDispatchSchema,
  ListDispatchesSchema,
  UpdateDispatchSchema,
} from "@/modules/dispatch/application";

import {
  PRODUCT_ID,
  RENTAL_ORDER_ID,
  VALID_CREATE_INPUT,
} from "./helpers/dispatch.fixtures";

describe("CreateDispatchSchema", () => {
  it("accepts valid create input", () => {
    const result = CreateDispatchSchema.parse(VALID_CREATE_INPUT);

    expect(result.dispatchNumber).toBe("DSP-2026-001");
    expect(result.items).toHaveLength(1);
  });

  it("rejects missing items", () => {
    expect(() =>
      CreateDispatchSchema.parse({ ...VALID_CREATE_INPUT, items: [] }),
    ).toThrow();
  });

  it("rejects invalid rental order id", () => {
    expect(() =>
      CreateDispatchSchema.parse({
        ...VALID_CREATE_INPUT,
        rentalOrderId: "bad",
      }),
    ).toThrow();
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      CreateDispatchSchema.parse({
        ...VALID_CREATE_INPUT,
        items: [{ productId: PRODUCT_ID, quantity: 0 }],
      }),
    ).toThrow();
  });

  it("rejects invalid delivery method", () => {
    expect(() =>
      CreateDispatchSchema.parse({
        ...VALID_CREATE_INPUT,
        deliveryMethod: "INVALID",
      }),
    ).toThrow();
  });

  it("rejects empty delivery address", () => {
    expect(() =>
      CreateDispatchSchema.parse({
        ...VALID_CREATE_INPUT,
        deliveryAddress: "",
      }),
    ).toThrow();
  });

  it("accepts null optional fields", () => {
    const result = CreateDispatchSchema.parse({
      ...VALID_CREATE_INPUT,
      vehicleNumber: null,
      driverName: null,
      driverPhone: null,
      remarks: null,
    });

    expect(result.remarks).toBeNull();
  });
});

describe("UpdateDispatchSchema", () => {
  it("accepts item replacement on update", () => {
    const result = UpdateDispatchSchema.parse({
      items: [{ productId: PRODUCT_ID, quantity: 8 }],
    });

    expect(result.items?.[0]?.quantity).toBe(8);
  });

  it("rejects empty items array on update", () => {
    expect(() =>
      UpdateDispatchSchema.parse({
        items: [],
      }),
    ).toThrow();
  });

  it("rejects empty update payload", () => {
    expect(() => UpdateDispatchSchema.parse({})).toThrow();
  });

  it("accepts markReady flag", () => {
    const result = UpdateDispatchSchema.parse({ markReady: true });

    expect(result.markReady).toBe(true);
  });
});

describe("ListDispatchesSchema", () => {
  it("accepts valid list query", () => {
    const result = ListDispatchesSchema.parse({
      page: "1",
      pageSize: "20",
      sortOrder: "desc",
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts status filter", () => {
    const result = ListDispatchesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      status: "READY",
    });

    expect(result.status).toBe("READY");
  });

  it("accepts rental order filter", () => {
    const result = ListDispatchesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      rentalOrderId: RENTAL_ORDER_ID,
    });

    expect(result.rentalOrderId).toBe(RENTAL_ORDER_ID);
  });

  it("accepts search filter", () => {
    const result = ListDispatchesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      search: "DSP-2026",
    });

    expect(result.search).toBe("DSP-2026");
  });

  it("accepts sortBy field", () => {
    const result = ListDispatchesSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      sortBy: "dispatchDate",
    });

    expect(result.sortBy).toBe("dispatchDate");
  });
});
