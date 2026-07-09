import type { InventoryId, ProductId, WarehouseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Inventory } from "./inventory.entity";
import type { InventoryListQuery } from "./inventory-list.query";
import type { CreateInventoryData, UpdateInventoryData } from "./inventory.types";

export interface IInventoryRepository {
  findById(id: InventoryId): Promise<Inventory | null>;
  findByProductAndWarehouse(
    productId: ProductId,
    warehouseId: WarehouseId,
  ): Promise<Inventory | null>;
  findPaged(query: InventoryListQuery): Promise<PaginatedResult<Inventory>>;
  exists(id: InventoryId): Promise<boolean>;
  create(data: CreateInventoryData): Promise<Inventory>;
  update(id: InventoryId, data: UpdateInventoryData): Promise<Inventory>;
  delete(id: InventoryId): Promise<void>;
}
