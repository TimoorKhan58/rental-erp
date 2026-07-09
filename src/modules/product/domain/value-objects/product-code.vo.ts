import type { Brand } from "@/shared/domain/ids";

import { ProductInvariantError } from "../product.errors";

export type ProductCode = Brand<string, "ProductCode">;

export function createProductCode(value: string): ProductCode {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ProductInvariantError("Product code is required", "productCode");
  }

  if (trimmed.length > 50) {
    throw new ProductInvariantError(
      "Product code must not exceed 50 characters",
      "productCode",
    );
  }

  return trimmed as ProductCode;
}
