import { Supplier } from "@/modules/supplier/domain/supplier.entity";
import type { SupplierListQuery } from "@/modules/supplier/domain/supplier-list.query";
import type { ISupplierRepository } from "@/modules/supplier/domain/supplier.repository.interface";
import type {
  CreateSupplierData,
  UpdateSupplierData,
} from "@/modules/supplier/domain/supplier.types";
import type { SupplierId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildSupplierEntity } from "./supplier.fixtures";

interface StoredSupplier {
  record: ReturnType<Supplier["toProps"]>;
}

export class InMemorySupplierRepository implements ISupplierRepository {
  private readonly store = new Map<string, StoredSupplier>();

  snapshot(): Map<string, StoredSupplier> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredSupplier>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(suppliers: Supplier[]): void {
    this.store.clear();
    for (const supplier of suppliers) {
      const props = supplier.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: SupplierId): Promise<Supplier | null> {
    const stored = this.store.get(id);
    return Promise.resolve(stored ? Supplier.reconstitute(stored.record) : null);
  }

  findByPhone(phone: string): Promise<Supplier | null> {
    for (const stored of this.store.values()) {
      if (stored.record.phone === phone) {
        return Promise.resolve(Supplier.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  findBySupplierCode(supplierCode: string): Promise<Supplier | null> {
    for (const stored of this.store.values()) {
      if (stored.record.supplierCode === supplierCode) {
        return Promise.resolve(Supplier.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(query: SupplierListQuery): Promise<PaginatedResult<Supplier>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Supplier.reconstitute(stored.record),
    );

    if (query.isActive !== undefined) {
      items = items.filter((item) => item.isActive === query.isActive);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.phone.includes(term) ||
          item.supplierCode.toLowerCase().includes(term) ||
          (item.email?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof Supplier] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof Supplier] ?? "",
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

  async exists(id: SupplierId): Promise<boolean> {
    return this.store.has(id);
  }

  async create(data: CreateSupplierData): Promise<Supplier> {
    const normalized = Supplier.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as SupplierId;

    const supplier = Supplier.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: supplier.toProps() });
    return supplier;
  }

  async update(id: SupplierId, data: UpdateSupplierData): Promise<Supplier> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Supplier not found");
    }

    const updated = Supplier.reconstitute({
      ...existing.record,
      name: data.name ?? existing.record.name,
      phone: data.phone ?? existing.record.phone,
      email: data.email !== undefined ? data.email : existing.record.email,
      address: data.address ?? existing.record.address,
      notes: data.notes !== undefined ? data.notes : existing.record.notes,
      isActive: data.isActive ?? existing.record.isActive,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async delete(id: SupplierId): Promise<void> {
    this.store.delete(id);
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededRepository(
  suppliers: Supplier[] = [buildSupplierEntity()],
): InMemorySupplierRepository {
  const repository = new InMemorySupplierRepository();
  repository.seed(suppliers);
  return repository;
}
