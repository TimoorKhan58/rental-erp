import { describe, expect, it } from "vitest";

import {
  CreateInventorySchema,
  InventoryIdParamSchema,
  UpdateInventorySchema,
} from "@/modules/inventory/application/schemas/inventory.schemas";
import { ListInventorySchema } from "@/modules/inventory/application/schemas/list-inventory.schema";
import { parseRequest } from "@/shared/application/validation";

import {
  PRODUCT_ID,
  VALID_CREATE_INPUT,
  WAREHOUSE_ID,
} from "./helpers/inventory.fixtures";

describe("Inventory validation schemas", () => {
  it("accepts valid create payload", () => {
    const result = parseRequest(CreateInventorySchema, VALID_CREATE_INPUT);
    expect(result.productId).toBe(PRODUCT_ID);
    expect(result.quantityOnHand).toBe(100);
    expect(result.reservedQuantity).toBe(10);
  });

  it("accepts create payload with defaults for optional quantities", () => {
    const result = parseRequest(CreateInventorySchema, {
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 50,
    });
    expect(result.reservedQuantity).toBeUndefined();
    expect(result.minimumStock).toBeUndefined();
  });

  it("rejects invalid productId", () => {
    expect(() =>
      parseRequest(CreateInventorySchema, {
        ...VALID_CREATE_INPUT,
        productId: "bad-id",
      }),
    ).toThrow();
  });

  it("rejects invalid warehouseId", () => {
    expect(() =>
      parseRequest(CreateInventorySchema, {
        ...VALID_CREATE_INPUT,
        warehouseId: "bad-id",
      }),
    ).toThrow();
  });

  it("rejects negative quantityOnHand", () => {
    expect(() =>
      parseRequest(CreateInventorySchema, {
        ...VALID_CREATE_INPUT,
        quantityOnHand: -1,
      }),
    ).toThrow();
  });

  it("rejects non-integer quantityOnHand", () => {
    expect(() =>
      parseRequest(CreateInventorySchema, {
        ...VALID_CREATE_INPUT,
        quantityOnHand: 1.5,
      }),
    ).toThrow();
  });

  it("accepts null maximumStock", () => {
    const result = parseRequest(CreateInventorySchema, {
      ...VALID_CREATE_INPUT,
      maximumStock: null,
    });
    expect(result.maximumStock).toBeNull();
  });

  it("accepts valid inventory id param", () => {
    const result = parseRequest(InventoryIdParamSchema, {
      id: "880e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.id).toBeTruthy();
  });

  it("rejects invalid inventory id param", () => {
    expect(() => parseRequest(InventoryIdParamSchema, { id: "bad-id" })).toThrow();
  });

  it("accepts valid update payload", () => {
    const result = parseRequest(UpdateInventorySchema, { quantityOnHand: 200 });
    expect(result.quantityOnHand).toBe(200);
  });

  it("rejects empty update payload", () => {
    expect(() => parseRequest(UpdateInventorySchema, {})).toThrow();
  });

  it("does not accept productId in update payload", () => {
    expect(() =>
      parseRequest(UpdateInventorySchema, {
        productId: PRODUCT_ID,
        quantityOnHand: 200,
      }),
    ).toThrow();
  });

  it("does not accept warehouseId in update payload", () => {
    expect(() =>
      parseRequest(UpdateInventorySchema, {
        warehouseId: WAREHOUSE_ID,
        quantityOnHand: 200,
      }),
    ).toThrow();
  });

  it("accepts valid pagination input", () => {
    const result = parseRequest(ListInventorySchema, {
      page: "1",
      pageSize: "20",
      search: PRODUCT_ID,
    });
    expect(result.page).toBe(1);
    expect(result.search).toBe(PRODUCT_ID);
  });

  it("accepts productId filter", () => {
    const result = parseRequest(ListInventorySchema, {
      page: 1,
      pageSize: 20,
      productId: PRODUCT_ID,
    });
    expect(result.productId).toBe(PRODUCT_ID);
  });

  it("accepts warehouseId filter", () => {
    const result = parseRequest(ListInventorySchema, {
      page: 1,
      pageSize: 20,
      warehouseId: WAREHOUSE_ID,
    });
    expect(result.warehouseId).toBe(WAREHOUSE_ID);
  });

  it("accepts quantityOnHand sort field", () => {
    const result = parseRequest(ListInventorySchema, {
      page: 1,
      pageSize: 20,
      sortBy: "quantityOnHand",
      sortOrder: "desc",
    });
    expect(result.sortBy).toBe("quantityOnHand");
  });

  it("rejects invalid pagination page", () => {
    expect(() =>
      parseRequest(ListInventorySchema, { page: 0, pageSize: 20 }),
    ).toThrow();
  });

  it("rejects overly long search term", () => {
    expect(() =>
      parseRequest(ListInventorySchema, {
        page: 1,
        pageSize: 20,
        search: "x".repeat(201),
      }),
    ).toThrow();
  });
});
