import type { InventoryId, ProductId, WarehouseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Inventory } from "./inventory.entity";
import type { InventoryListQuery } from "./inventory-list.query";
import type { CreateInventoryData, UpdateInventoryData } from "./inventory.types";

export interface IInventoryRepository {
  findById(id: InventoryId): Promise<Inventory | null>;
  /**
   * Loads inventory and acquires a row lock until the ambient Unit of Work
   * transaction commits or rolls back (`SELECT … FOR UPDATE` in Prisma).
   * Callers that mutate quantities must use this instead of `findById`.
   */
  findByIdForUpdate(id: InventoryId): Promise<Inventory | null>;
  findByProductAndWarehouse(
    productId: ProductId,
    warehouseId: WarehouseId,
  ): Promise<Inventory | null>;
  /** Batch lookup for multi-line stock mutations (avoids N+1). */
  findByProductsAndWarehouse(
    productIds: ProductId[],
    warehouseId: WarehouseId,
  ): Promise<Inventory[]>;
  findPaged(query: InventoryListQuery): Promise<PaginatedResult<Inventory>>;
  exists(id: InventoryId): Promise<boolean>;
  create(data: CreateInventoryData): Promise<Inventory>;
  update(id: InventoryId, data: UpdateInventoryData): Promise<Inventory>;
  delete(id: InventoryId): Promise<void>;
  /**
   * Releases a test-double lock acquired by `findByIdForUpdate` when no
   * update/delete follows. Prisma no-op — Postgres holds the lock until UoW end.
   */
  unlockInventory(id: InventoryId): Promise<void>;
}
