import type { Brand } from "@/shared/domain/ids";

import { ProductInvariantError } from "../product.errors";

export type ProductName = Brand<string, "ProductName">;

export function createProductName(value: string): ProductName {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ProductInvariantError("Product name is required", "name");
  }

  if (trimmed.length > 200) {
    throw new ProductInvariantError(
      "Product name must not exceed 200 characters",
      "name",
    );
  }

  return trimmed as ProductName;
}
