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
  /**
   * Atomically increments reservedQuantity when capacity allows.
   *
   * Succeeds only when the inventory row exists, is active, and
   * reservedQuantity + quantity <= quantityOnHand.
   *
   * Returns the updated inventory on success, or null when the
   * capacity/active predicate matches zero rows.
   */
  reserveAvailableQuantity(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null>;
  /**
   * Atomically decrements reservedQuantity when enough reserved stock exists.
   *
   * Succeeds only when the inventory row exists and
   * reservedQuantity >= quantity.
   * Does not require the inventory to be active (holds must still clear).
   *
   * Returns the updated inventory on success, or null when the
   * reserved-quantity predicate matches zero rows.
   */
  releaseReservedQuantity(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null>;
  /**
   * Phase 29 (F-03): atomically decrements quantityOnHand for an OUT movement.
   *
   * Succeeds only when the inventory row exists, is active, and
   * quantityOnHand >= quantity.
   *
   * Returns the updated inventory on success, or null when the predicate
   * matches zero rows (insufficient stock or row inactive/missing).
   */
  decrementOnHand(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null>;
  /**
   * Phase 29 (F-03): atomically increments quantityOnHand for an IN movement.
   *
   * Succeeds only when the inventory row exists and is active.
   *
   * Returns the updated inventory on success, or null when the row is
   * missing or inactive.
   */
  incrementOnHand(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null>;
  /**
   * Phase 29 (F-03): atomically applies a signed ADJUSTMENT delta to
   * quantityOnHand.
   *
   * Succeeds only when the inventory row exists, is active, and the
   * resulting quantityOnHand would remain >= reservedQuantity (so the
   * invariant `reservedQuantity <= quantityOnHand` is preserved).
   *
   * Returns the updated inventory on success, or null when the predicate
   * matches zero rows.
   */
  applyAdjustment(
    id: InventoryId,
    signedDelta: number,
  ): Promise<Inventory | null>;
  delete(id: InventoryId): Promise<void>;
}
