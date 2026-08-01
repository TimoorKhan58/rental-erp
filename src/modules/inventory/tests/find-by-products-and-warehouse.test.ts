import { describe, expect, it } from "vitest";

import { InMemoryInventoryRepository } from "@/modules/inventory/tests/helpers/in-memory-inventory.repository";
import {
  OTHER_PRODUCT_ID,
  PRODUCT_ID,
  WAREHOUSE_ID,
  buildInventoryEntity,
} from "@/modules/inventory/tests/helpers/inventory.fixtures";
import type { ProductId } from "@/shared/domain/ids";

describe("InMemoryInventoryRepository.findByProductsAndWarehouse", () => {
  it("returns matching inventory rows in one batch lookup", async () => {
    const repository = new InMemoryInventoryRepository();
    const first = buildInventoryEntity({
      productId: PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 10,
      reservedQuantity: 2,
    });
    const second = buildInventoryEntity({
      id: "880e8400-e29b-41d4-a716-446655440001" as typeof first.id,
      productId: OTHER_PRODUCT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityOnHand: 5,
      reservedQuantity: 0,
    });
    repository.seed([first, second]);

    const missingProductId =
      "00000000-0000-4000-8000-000000000099" as ProductId;
    const matches = await repository.findByProductsAndWarehouse(
      [PRODUCT_ID, OTHER_PRODUCT_ID, missingProductId],
      WAREHOUSE_ID,
    );

    expect(matches).toHaveLength(2);
    expect(matches.map((item) => item.productId).sort()).toEqual(
      [OTHER_PRODUCT_ID, PRODUCT_ID].sort(),
    );
  });

  it("returns empty array for empty product id list", async () => {
    const repository = new InMemoryInventoryRepository();
    const matches = await repository.findByProductsAndWarehouse([], WAREHOUSE_ID);
    expect(matches).toEqual([]);
  });
});
