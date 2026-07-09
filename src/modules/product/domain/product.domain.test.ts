import { describe, expect, it } from "vitest";

import { Product } from "@/modules/product/domain/product.entity";
import {
  ProductDomainError,
  ProductInvariantError,
} from "@/modules/product/domain/product.errors";
import {
  createProductCode,
  createProductName,
  createRentalRate,
  createReplacementCost,
  createUnit,
} from "@/modules/product/domain";

import {
  buildCreateProductData,
  PRODUCT_ID,
} from "../tests/helpers/product.fixtures";

describe("Product entity", () => {
  it("creates normalized product props", () => {
    const props = Product.create(buildCreateProductData());

    expect(props.name).toBe("Wedding Tent 20x40");
    expect(props.description).toBe(
      "Large wedding tent suitable for outdoor events",
    );
    expect(props.rentalRate).toBe(1500);
    expect(props.replacementCost).toBe(50000);
    expect(props.isActive).toBe(true);
  });

  it("trims required text fields", () => {
    const props = Product.create(
      buildCreateProductData({
        name: createProductName("  Trimmed Name  "),
      }),
    );

    expect(props.name).toBe("Trimmed Name");
  });

  it("allows null replacement cost", () => {
    const props = Product.create(
      buildCreateProductData({ replacementCost: null }),
    );

    expect(props.replacementCost).toBeNull();
  });

  it("reconstitutes persisted product", () => {
    const created = Product.create(buildCreateProductData());
    const now = new Date();

    const product = Product.reconstitute({
      id: PRODUCT_ID,
      ...created,
      createdAt: now,
      updatedAt: now,
    });

    expect(product.toProps().name).toBe("Wedding Tent 20x40");
  });
});

describe("Product value objects", () => {
  it("accepts valid product code", () => {
    expect(createProductCode("PROD-001")).toBe("PROD-001");
  });

  it("rejects empty product code", () => {
    expect(() => createProductCode("  ")).toThrow(ProductInvariantError);
  });

  it("accepts valid product name", () => {
    expect(createProductName("Wedding Tent 20x40")).toBe("Wedding Tent 20x40");
  });

  it("rejects empty product name", () => {
    expect(() => createProductName("  ")).toThrow(ProductInvariantError);
  });

  it("accepts valid unit", () => {
    expect(createUnit("day")).toBe("day");
  });

  it("rejects empty unit", () => {
    expect(() => createUnit("  ")).toThrow(ProductInvariantError);
  });

  it("accepts positive rental rate", () => {
    expect(createRentalRate(1500)).toBe(1500);
  });

  it("rejects zero rental rate", () => {
    expect(() => createRentalRate(0)).toThrow(ProductInvariantError);
  });

  it("rejects negative rental rate", () => {
    expect(() => createRentalRate(-10)).toThrow(ProductInvariantError);
  });

  it("accepts non-negative replacement cost", () => {
    expect(createReplacementCost(50000)).toBe(50000);
  });

  it("accepts zero replacement cost", () => {
    expect(createReplacementCost(0)).toBe(0);
  });

  it("returns null for missing replacement cost", () => {
    expect(createReplacementCost(null)).toBeNull();
    expect(createReplacementCost(undefined)).toBeNull();
  });

  it("rejects negative replacement cost", () => {
    expect(() => createReplacementCost(-1)).toThrow(ProductInvariantError);
  });
});

describe("Product domain errors", () => {
  it("creates domain error with name", () => {
    const error = new ProductDomainError("test error");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ProductDomainError");
  });

  it("creates invariant error with field", () => {
    const error = new ProductInvariantError("invalid", "rentalRate");
    expect(error.field).toBe("rentalRate");
  });
});
