import { describe, expect, it } from "vitest";

import {
  CreateRepairSchema,
  ListRepairsSchema,
  UpdateRepairSchema,
} from "@/modules/repair/application/schemas/repair.schemas";

import {
  PRODUCT_ID,
  RETURN_ID,
  VALID_CREATE_INPUT,
  WAREHOUSE_ID,
} from "./helpers/repair.fixtures";

describe("CreateRepairSchema", () => {
  it("accepts valid create input", () => {
    const result = CreateRepairSchema.parse(VALID_CREATE_INPUT);

    expect(result.repairNumber).toBe("RPR-2026-001");
    expect(result.quantity).toBe(1);
  });

  it("rejects invalid return id", () => {
    expect(() =>
      CreateRepairSchema.parse({
        ...VALID_CREATE_INPUT,
        returnId: "bad",
      }),
    ).toThrow();
  });

  it("rejects invalid return item id", () => {
    expect(() =>
      CreateRepairSchema.parse({
        ...VALID_CREATE_INPUT,
        returnItemId: "bad",
      }),
    ).toThrow();
  });

  it("rejects invalid product id", () => {
    expect(() =>
      CreateRepairSchema.parse({
        ...VALID_CREATE_INPUT,
        productId: "bad",
      }),
    ).toThrow();
  });

  it("rejects invalid warehouse id", () => {
    expect(() =>
      CreateRepairSchema.parse({
        ...VALID_CREATE_INPUT,
        warehouseId: "bad",
      }),
    ).toThrow();
  });

  it("rejects non-positive quantity", () => {
    expect(() =>
      CreateRepairSchema.parse({
        ...VALID_CREATE_INPUT,
        quantity: 0,
      }),
    ).toThrow();
  });

  it("rejects negative repair cost", () => {
    expect(() =>
      CreateRepairSchema.parse({
        ...VALID_CREATE_INPUT,
        repairCost: -1,
      }),
    ).toThrow();
  });

  it("rejects empty repair number", () => {
    expect(() =>
      CreateRepairSchema.parse({
        ...VALID_CREATE_INPUT,
        repairNumber: "",
      }),
    ).toThrow();
  });

  it("accepts null optional fields", () => {
    const result = CreateRepairSchema.parse({
      ...VALID_CREATE_INPUT,
      repairNotes: null,
      technician: null,
    });

    expect(result.repairNotes).toBeNull();
    expect(result.technician).toBeNull();
  });
});

describe("UpdateRepairSchema", () => {
  it("accepts repair cost update", () => {
    const result = UpdateRepairSchema.parse({ repairCost: 100 });

    expect(result.repairCost).toBe(100);
  });

  it("accepts quantity update", () => {
    const result = UpdateRepairSchema.parse({ quantity: 2 });

    expect(result.quantity).toBe(2);
  });

  it("rejects empty update payload", () => {
    expect(() => UpdateRepairSchema.parse({})).toThrow();
  });

  it("accepts notes update", () => {
    const result = UpdateRepairSchema.parse({ repairNotes: "Updated notes" });

    expect(result.repairNotes).toBe("Updated notes");
  });

  it("rejects negative repair cost on update", () => {
    expect(() => UpdateRepairSchema.parse({ repairCost: -5 })).toThrow();
  });
});

describe("ListRepairsSchema", () => {
  it("accepts valid list query", () => {
    const result = ListRepairsSchema.parse({
      page: "1",
      pageSize: "20",
      sortOrder: "desc",
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts status filter", () => {
    const result = ListRepairsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      status: "PENDING",
    });

    expect(result.status).toBe("PENDING");
  });

  it("accepts return filter", () => {
    const result = ListRepairsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      returnId: RETURN_ID,
    });

    expect(result.returnId).toBe(RETURN_ID);
  });

  it("accepts product filter", () => {
    const result = ListRepairsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      productId: PRODUCT_ID,
    });

    expect(result.productId).toBe(PRODUCT_ID);
  });

  it("accepts warehouse filter", () => {
    const result = ListRepairsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      warehouseId: WAREHOUSE_ID,
    });

    expect(result.warehouseId).toBe(WAREHOUSE_ID);
  });

  it("accepts search filter", () => {
    const result = ListRepairsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      search: "RPR-2026",
    });

    expect(result.search).toBe("RPR-2026");
  });

  it("accepts sortBy field", () => {
    const result = ListRepairsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      sortBy: "repairNumber",
    });

    expect(result.sortBy).toBe("repairNumber");
  });

  it("rejects search term exceeding max length", () => {
    expect(() =>
      ListRepairsSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        search: "x".repeat(201),
      }),
    ).toThrow();
  });
});
