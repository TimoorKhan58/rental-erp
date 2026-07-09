import { describe, expect, it } from "vitest";

import {
  CreateProductSchema,
  ProductIdParamSchema,
  UpdateProductSchema,
} from "@/modules/product/application/schemas/product.schemas";
import { ListProductsSchema } from "@/modules/product/application/schemas/list-products.schema";
import { parseRequest } from "@/shared/application/validation";

import { VALID_CREATE_INPUT } from "./helpers/product.fixtures";

describe("Product validation schemas", () => {
  it("accepts valid create payload", () => {
    const result = parseRequest(CreateProductSchema, VALID_CREATE_INPUT);
    expect(result.productCode).toBe("PROD-001");
    expect(result.rentalRate).toBe(1500);
  });

  it("accepts create payload without optional replacement cost", () => {
    const inputWithoutCost = {
      productCode: VALID_CREATE_INPUT.productCode,
      name: VALID_CREATE_INPUT.name,
      description: VALID_CREATE_INPUT.description,
      unit: VALID_CREATE_INPUT.unit,
      rentalRate: VALID_CREATE_INPUT.rentalRate,
      isActive: VALID_CREATE_INPUT.isActive,
    };
    const result = parseRequest(CreateProductSchema, inputWithoutCost);
    expect(result.replacementCost).toBeUndefined();
  });

  it("rejects invalid product code", () => {
    expect(() =>
      parseRequest(CreateProductSchema, {
        ...VALID_CREATE_INPUT,
        productCode: "",
      }),
    ).toThrow();
  });

  it("rejects zero rental rate", () => {
    expect(() =>
      parseRequest(CreateProductSchema, {
        ...VALID_CREATE_INPUT,
        rentalRate: 0,
      }),
    ).toThrow();
  });

  it("rejects negative replacement cost", () => {
    expect(() =>
      parseRequest(CreateProductSchema, {
        ...VALID_CREATE_INPUT,
        replacementCost: -1,
      }),
    ).toThrow();
  });

  it("accepts null replacement cost", () => {
    const result = parseRequest(CreateProductSchema, {
      ...VALID_CREATE_INPUT,
      replacementCost: null,
    });
    expect(result.replacementCost).toBeNull();
  });

  it("accepts valid product id param", () => {
    const result = parseRequest(ProductIdParamSchema, {
      id: "770e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.id).toBeTruthy();
  });

  it("rejects invalid product id param", () => {
    expect(() => parseRequest(ProductIdParamSchema, { id: "bad-id" })).toThrow();
  });

  it("accepts valid update payload", () => {
    const result = parseRequest(UpdateProductSchema, { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("rejects empty update payload", () => {
    expect(() => parseRequest(UpdateProductSchema, {})).toThrow();
  });

  it("does not accept productCode in update payload", () => {
    expect(() =>
      parseRequest(UpdateProductSchema, {
        productCode: "PROD-999",
        name: "Updated",
      }),
    ).toThrow();
  });

  it("accepts valid pagination input", () => {
    const result = parseRequest(ListProductsSchema, {
      page: "1",
      pageSize: "20",
      search: "Wedding",
    });
    expect(result.page).toBe(1);
    expect(result.search).toBe("Wedding");
  });

  it("accepts rentalRate sort field", () => {
    const result = parseRequest(ListProductsSchema, {
      page: 1,
      pageSize: 20,
      sortBy: "rentalRate",
      sortOrder: "desc",
    });
    expect(result.sortBy).toBe("rentalRate");
  });

  it("rejects invalid pagination page", () => {
    expect(() =>
      parseRequest(ListProductsSchema, { page: 0, pageSize: 20 }),
    ).toThrow();
  });

  it("rejects overly long search term", () => {
    expect(() =>
      parseRequest(ListProductsSchema, {
        page: 1,
        pageSize: 20,
        search: "x".repeat(201),
      }),
    ).toThrow();
  });
});
