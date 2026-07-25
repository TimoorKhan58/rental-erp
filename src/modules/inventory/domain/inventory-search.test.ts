import { describe, expect, it } from "vitest";

import { buildInventorySearchClause } from "./inventory-search";

describe("buildInventorySearchClause", () => {
  it("returns undefined for blank search", () => {
    expect(buildInventorySearchClause(undefined)).toBeUndefined();
    expect(buildInventorySearchClause("   ")).toBeUndefined();
  });

  it("searches product and warehouse text fields for free-text terms", () => {
    const clause = buildInventorySearchClause("tent");

    expect(clause?.OR).toEqual([
      { product: { productCode: { contains: "tent", mode: "insensitive" } } },
      { product: { name: { contains: "tent", mode: "insensitive" } } },
      { warehouse: { warehouseCode: { contains: "tent", mode: "insensitive" } } },
      { warehouse: { name: { contains: "tent", mode: "insensitive" } } },
    ]);
  });

  it("adds exact id matches when the term is a UUID", () => {
    const productId = "11111111-1111-1111-1111-111111111111";
    const clause = buildInventorySearchClause(productId);

    expect(clause?.OR).toContainEqual({ productId });
    expect(clause?.OR).toContainEqual({ warehouseId: productId });
  });
});
