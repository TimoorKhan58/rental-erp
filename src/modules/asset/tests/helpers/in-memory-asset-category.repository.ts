import { AssetCategory } from "@/modules/asset/domain/asset-category.entity";
import type { AssetCategoryListQuery } from "@/modules/asset/domain/asset-category-list.query";
import type { IAssetCategoryRepository } from "@/modules/asset/domain/asset-category.repository.interface";
import type {
  CreateAssetCategoryData,
  UpdateAssetCategoryData,
} from "@/modules/asset/domain/asset-category.types";
import { toUpdatedAssetCategoryProps } from "@/modules/asset/domain/asset-category.entity";
import type { AssetCategoryId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildCategoryEntity } from "./asset-category.fixtures";

interface StoredCategory {
  record: ReturnType<AssetCategory["toProps"]>;
}

export class InMemoryAssetCategoryRepository implements IAssetCategoryRepository {
  private readonly store = new Map<string, StoredCategory>();

  snapshot(): Map<string, StoredCategory> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredCategory>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(categories: AssetCategory[]): void {
    this.store.clear();
    for (const category of categories) {
      const props = category.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: AssetCategoryId): Promise<AssetCategory | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? AssetCategory.reconstitute(stored.record) : null,
    );
  }

  findByName(name: string): Promise<AssetCategory | null> {
    const normalized = name.trim().toLowerCase();

    for (const stored of this.store.values()) {
      if (stored.record.name.toLowerCase() === normalized) {
        return Promise.resolve(AssetCategory.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(
    query: AssetCategoryListQuery,
  ): Promise<PaginatedResult<AssetCategory>> {
    let items = Array.from(this.store.values()).map((stored) =>
      AssetCategory.reconstitute(stored.record),
    );

    if (query.isActive !== undefined) {
      items = items.filter((item) => item.isActive === query.isActive);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          (item.description?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof AssetCategory] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof AssetCategory] ?? "",
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

  async exists(id: AssetCategoryId): Promise<boolean> {
    return this.store.has(id);
  }

  async create(data: CreateAssetCategoryData): Promise<AssetCategory> {
    const normalized = AssetCategory.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as AssetCategoryId;

    const category = AssetCategory.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: category.toProps() });
    return category;
  }

  async update(
    id: AssetCategoryId,
    data: UpdateAssetCategoryData,
  ): Promise<AssetCategory> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Asset category not found");
    }

    const entity = AssetCategory.reconstitute(existing.record);
    const updated = AssetCategory.reconstitute(
      toUpdatedAssetCategoryProps(entity, data),
    );

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async delete(id: AssetCategoryId): Promise<void> {
    this.store.delete(id);
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededCategoryRepository(
  categories: AssetCategory[] = [buildCategoryEntity()],
): InMemoryAssetCategoryRepository {
  const repository = new InMemoryAssetCategoryRepository();
  repository.seed(categories);
  return repository;
}
