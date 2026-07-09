import { Warehouse } from "@/modules/warehouse/domain/warehouse.entity";
import type { WarehouseListQuery } from "@/modules/warehouse/domain/warehouse-list.query";
import type { IWarehouseRepository } from "@/modules/warehouse/domain/warehouse.repository.interface";
import type {
  CreateWarehouseData,
  UpdateWarehouseData,
} from "@/modules/warehouse/domain/warehouse.types";
import type { WarehouseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildWarehouseEntity } from "./warehouse.fixtures";

interface StoredWarehouse {
  record: ReturnType<Warehouse["toProps"]>;
}

export class InMemoryWarehouseRepository implements IWarehouseRepository {
  private readonly store = new Map<string, StoredWarehouse>();

  snapshot(): Map<string, StoredWarehouse> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredWarehouse>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(warehouses: Warehouse[]): void {
    this.store.clear();
    for (const warehouse of warehouses) {
      const props = warehouse.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: WarehouseId): Promise<Warehouse | null> {
    const stored = this.store.get(id);
    return Promise.resolve(stored ? Warehouse.reconstitute(stored.record) : null);
  }

  findByWarehouseCode(warehouseCode: string): Promise<Warehouse | null> {
    for (const stored of this.store.values()) {
      if (stored.record.warehouseCode === warehouseCode) {
        return Promise.resolve(Warehouse.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(
    query: WarehouseListQuery,
  ): Promise<PaginatedResult<Warehouse>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Warehouse.reconstitute(stored.record),
    );

    if (query.isActive !== undefined) {
      items = items.filter((item) => item.isActive === query.isActive);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.warehouseCode.toLowerCase().includes(term) ||
          (item.description?.toLowerCase().includes(term) ?? false) ||
          (item.address?.toLowerCase().includes(term) ?? false) ||
          (item.contactPerson?.toLowerCase().includes(term) ?? false) ||
          (item.phone?.includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof Warehouse] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof Warehouse] ?? "",
        ).toLowerCase();

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

  async exists(id: WarehouseId): Promise<boolean> {
    return this.store.has(id);
  }

  async create(data: CreateWarehouseData): Promise<Warehouse> {
    const normalized = Warehouse.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as WarehouseId;

    const warehouse = Warehouse.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: warehouse.toProps() });
    return warehouse;
  }

  async update(id: WarehouseId, data: UpdateWarehouseData): Promise<Warehouse> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Warehouse not found");
    }

    const updated = Warehouse.reconstitute({
      ...existing.record,
      name: data.name ?? existing.record.name,
      description:
        data.description !== undefined
          ? data.description
          : existing.record.description,
      address:
        data.address !== undefined ? data.address : existing.record.address,
      contactPerson:
        data.contactPerson !== undefined
          ? data.contactPerson
          : existing.record.contactPerson,
      phone: data.phone !== undefined ? data.phone : existing.record.phone,
      isActive: data.isActive ?? existing.record.isActive,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async delete(id: WarehouseId): Promise<void> {
    this.store.delete(id);
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededRepository(
  warehouses: Warehouse[] = [buildWarehouseEntity()],
): InMemoryWarehouseRepository {
  const repository = new InMemoryWarehouseRepository();
  repository.seed(warehouses);
  return repository;
}
