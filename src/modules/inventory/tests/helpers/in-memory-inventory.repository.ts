import { Inventory } from "@/modules/inventory/domain/inventory.entity";
import type { InventoryListQuery } from "@/modules/inventory/domain/inventory-list.query";
import type { IInventoryRepository } from "@/modules/inventory/domain/inventory.repository.interface";
import type {
  CreateInventoryData,
  UpdateInventoryData,
} from "@/modules/inventory/domain/inventory.types";
import type { InventoryId, ProductId, WarehouseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildInventoryEntity } from "./inventory.fixtures";

interface StoredInventory {
  record: ReturnType<Inventory["toProps"]>;
}

function deriveInventoryStockStatus(item: {
  quantityOnHand: number;
  reservedQuantity: number;
  minimumStock: number;
  maximumStock: number | null;
}): "in-stock" | "low-stock" | "out-of-stock" | "overstock" {
  const availableQuantity = item.quantityOnHand - item.reservedQuantity;

  if (availableQuantity <= 0) {
    return "out-of-stock";
  }

  if (item.minimumStock > 0 && availableQuantity <= item.minimumStock) {
    return "low-stock";
  }

  if (item.maximumStock !== null && item.quantityOnHand > item.maximumStock) {
    return "overstock";
  }

  return "in-stock";
}

export class InMemoryInventoryRepository implements IInventoryRepository {
  private readonly store = new Map<string, StoredInventory>();
  /** Simulates SELECT FOR UPDATE: queue waiters, hold until unlockInventory. */
  private readonly lockTails = new Map<string, Promise<void>>();
  private readonly lockReleases = new Map<string, () => void>();

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

  async findByIdForUpdate(id: InventoryId): Promise<Inventory | null> {
    const previous = this.lockTails.get(id) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.lockTails.set(
      id,
      previous.then(() => gate),
    );
    await previous;
    this.lockReleases.set(id, release);

    return this.findById(id);
  }

  unlockInventory(id: InventoryId): Promise<void> {
    const release = this.lockReleases.get(id);
    if (release !== undefined) {
      this.lockReleases.delete(id);
      release();
    }

    return Promise.resolve();
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

  findByProductsAndWarehouse(
    productIds: ProductId[],
    warehouseId: WarehouseId,
  ): Promise<Inventory[]> {
    const idSet = new Set(productIds);
    const matches: Inventory[] = [];

    for (const stored of this.store.values()) {
      if (
        idSet.has(stored.record.productId as ProductId) &&
        stored.record.warehouseId === warehouseId
      ) {
        matches.push(Inventory.reconstitute(stored.record));
      }
    }

    return Promise.resolve(matches);
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

    if (query.stockStatus !== undefined) {
      items = items.filter(
        (item) => deriveInventoryStockStatus(item) === query.stockStatus,
      );
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
