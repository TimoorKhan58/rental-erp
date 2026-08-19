import { Inventory } from "@/modules/inventory/domain/inventory.entity";
import type { InventoryListQuery } from "@/modules/inventory/domain/inventory-list.query";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type {
  CreateInventoryData,
  UpdateInventoryData,
} from "@/modules/inventory/domain/inventory.types";
import type { InventoryId, ProductId, WarehouseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { acquireAvailabilityCommitLock } from "@/modules/inventory/infrastructure/availability-commit-lock";

import { buildInventoryEntity } from "./inventory.fixtures";

interface StoredInventory {
  record: ReturnType<Inventory["toProps"]>;
}

export class InMemoryInventoryRepository implements IInventoryRepository {
  private readonly store = new Map<string, StoredInventory>();

  snapshot(): Map<string, StoredInventory> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredInventory>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(inventories: Inventory[]): void {
    this.store.clear();
    for (const inventory of inventories) {
      const props = inventory.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: InventoryId): Promise<Inventory | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? Inventory.reconstitute(stored.record) : null,
    );
  }

  findByProductAndWarehouse(
    productId: ProductId,
    warehouseId: WarehouseId,
  ): Promise<Inventory | null> {
    for (const stored of this.store.values()) {
      if (
        stored.record.productId === productId &&
        stored.record.warehouseId === warehouseId
      ) {
        return Promise.resolve(Inventory.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(
    query: InventoryListQuery,
  ): Promise<PaginatedResult<Inventory>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Inventory.reconstitute(stored.record),
    );

    if (query.productId !== undefined) {
      items = items.filter((item) => item.productId === query.productId);
    }

    if (query.warehouseId !== undefined) {
      items = items.filter((item) => item.warehouseId === query.warehouseId);
    }

    if (query.isActive !== undefined) {
      items = items.filter((item) => item.isActive === query.isActive);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.productId.toLowerCase().includes(term) ||
          item.warehouseId.toLowerCase().includes(term),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof Inventory] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof Inventory] ?? "",
        ).toLowerCase();

        if (typeof left[query.sortBy as keyof Inventory] === "number") {
          return (
            ((left[query.sortBy as keyof Inventory] as number) -
              (right[query.sortBy as keyof Inventory] as number)) *
            direction
          );
        }

        return leftValue.localeCompare(rightValue) * direction;
      });
    }

    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    const pagedItems = items.slice(start, start + query.pageSize);

    return {
      items: pagedItems,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  async exists(id: InventoryId): Promise<boolean> {
    return this.store.has(id);
  }

  async create(data: CreateInventoryData): Promise<Inventory> {
    const normalized = Inventory.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as InventoryId;

    const inventory = Inventory.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: inventory.toProps() });
    return inventory;
  }

  async update(id: InventoryId, data: UpdateInventoryData): Promise<Inventory> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Inventory not found");
    }

    const updated = Inventory.reconstitute({
      id: existing.record.id,
      productId: existing.record.productId,
      warehouseId: existing.record.warehouseId,
      quantityOnHand: data.quantityOnHand ?? existing.record.quantityOnHand,
      reservedQuantity:
        data.reservedQuantity ?? existing.record.reservedQuantity,
      minimumStock: data.minimumStock ?? existing.record.minimumStock,
      maximumStock:
        data.maximumStock !== undefined
          ? data.maximumStock
          : existing.record.maximumStock,
      isActive: data.isActive ?? existing.record.isActive,
      createdAt: existing.record.createdAt,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  /**
   * Mirrors production atomic RESERVE semantics without awaiting between
   * check and write so concurrent Promise.all callers serialize correctly
   * on the event loop.
   */
  async reserveAvailableQuantity(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return null;
    }

    const existing = this.store.get(id);

    if (!existing || !existing.record.isActive) {
      return null;
    }

    if (
      existing.record.reservedQuantity + quantity >
      existing.record.quantityOnHand
    ) {
      return null;
    }

    const updated = Inventory.reconstitute({
      ...existing.record,
      reservedQuantity: existing.record.reservedQuantity + quantity,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  /**
   * Mirrors production atomic RELEASE semantics. Does not require isActive.
   */
  async releaseReservedQuantity(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return null;
    }

    const existing = this.store.get(id);

    if (!existing) {
      return null;
    }

    if (existing.record.reservedQuantity < quantity) {
      return null;
    }

    const updated = Inventory.reconstitute({
      ...existing.record,
      reservedQuantity: existing.record.reservedQuantity - quantity,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  /**
   * Phase 29 (F-03): mirrors production atomic OUT semantics.
   */
  async decrementOnHand(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return null;
    }

    const existing = this.store.get(id);

    if (!existing || !existing.record.isActive) {
      return null;
    }

    if (existing.record.quantityOnHand < quantity) {
      return null;
    }

    const updated = Inventory.reconstitute({
      ...existing.record,
      quantityOnHand: existing.record.quantityOnHand - quantity,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  /**
   * Phase 29 (F-03): mirrors production atomic IN semantics.
   */
  async incrementOnHand(
    id: InventoryId,
    quantity: number,
  ): Promise<Inventory | null> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return null;
    }

    const existing = this.store.get(id);

    if (!existing || !existing.record.isActive) {
      return null;
    }

    const updated = Inventory.reconstitute({
      ...existing.record,
      quantityOnHand: existing.record.quantityOnHand + quantity,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  /**
   * Phase 29 (F-03): mirrors production atomic ADJUSTMENT semantics.
   */
  async applyAdjustment(
    id: InventoryId,
    signedDelta: number,
  ): Promise<Inventory | null> {
    if (!Number.isInteger(signedDelta) || signedDelta === 0) {
      return null;
    }

    const existing = this.store.get(id);

    if (!existing || !existing.record.isActive) {
      return null;
    }

    const nextOnHand = existing.record.quantityOnHand + signedDelta;
    if (nextOnHand < existing.record.reservedQuantity) {
      return null;
    }

    const updated = Inventory.reconstitute({
      ...existing.record,
      quantityOnHand: nextOnHand,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async lockForAvailabilityCommit(id: InventoryId): Promise<void> {
    if (!this.store.has(id)) {
      throw new Error("Inventory not found");
    }

    await acquireAvailabilityCommitLock(id);
  }

  async delete(id: InventoryId): Promise<void> {
    this.store.delete(id);
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededRepository(
  inventories: Inventory[] = [buildInventoryEntity()],
): InMemoryInventoryRepository {
  const repository = new InMemoryInventoryRepository();
  repository.seed(inventories);
  return repository;
}
