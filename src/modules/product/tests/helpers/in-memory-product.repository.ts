import { Product } from "@/modules/product/domain/product.entity";
import type { ProductListQuery } from "@/modules/product/domain/product-list.query";
import type { IProductRepository } from "@/modules/product/domain/product.repository.interface";
import type {
  CreateProductData,
  UpdateProductData,
} from "@/modules/product/domain/product.types";
import type { ProductId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildProductEntity } from "./product.fixtures";

interface StoredProduct {
  record: ReturnType<Product["toProps"]>;
}

export class InMemoryProductRepository implements IProductRepository {
  private readonly store = new Map<string, StoredProduct>();

  snapshot(): Map<string, StoredProduct> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredProduct>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(products: Product[]): void {
    this.store.clear();
    for (const product of products) {
      const props = product.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: ProductId): Promise<Product | null> {
    const stored = this.store.get(id);
    return Promise.resolve(stored ? Product.reconstitute(stored.record) : null);
  }

  findByProductCode(productCode: string): Promise<Product | null> {
    for (const stored of this.store.values()) {
      if (stored.record.productCode === productCode) {
        return Promise.resolve(Product.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(query: ProductListQuery): Promise<PaginatedResult<Product>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Product.reconstitute(stored.record),
    );

    if (query.isActive !== undefined) {
      items = items.filter((item) => item.isActive === query.isActive);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.productCode.toLowerCase().includes(term) ||
          (item.description?.toLowerCase().includes(term) ?? false) ||
          item.unit.toLowerCase().includes(term),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof Product] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof Product] ?? "",
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

  async exists(id: ProductId): Promise<boolean> {
    return this.store.has(id);
  }

  async create(data: CreateProductData): Promise<Product> {
    const normalized = Product.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as ProductId;

    const product = Product.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: product.toProps() });
    return product;
  }

  async update(id: ProductId, data: UpdateProductData): Promise<Product> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Product not found");
    }

    const updated = Product.reconstitute({
      ...existing.record,
      name: data.name ?? existing.record.name,
      description:
        data.description !== undefined
          ? data.description
          : existing.record.description,
      unit: data.unit ?? existing.record.unit,
      rentalRate: data.rentalRate ?? existing.record.rentalRate,
      replacementCost:
        data.replacementCost !== undefined
          ? data.replacementCost
          : existing.record.replacementCost,
      isActive: data.isActive ?? existing.record.isActive,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async delete(id: ProductId): Promise<void> {
    this.store.delete(id);
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededRepository(
  products: Product[] = [buildProductEntity()],
): InMemoryProductRepository {
  const repository = new InMemoryProductRepository();
  repository.seed(products);
  return repository;
}
