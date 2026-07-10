import { Product } from "@/modules/product/domain/product.entity";
import type { ProductListQuery } from "@/modules/product/domain/product-list.query";
import type { ProductRecord } from "@/modules/product/domain/product.repository.interface";
import type { IProductRepository } from "@/modules/product/domain/product.repository.interface";
import type {
  CreateProductData,
  ProductMetadata,
  UpdateProductData,
} from "@/modules/product/domain/product.types";
import type { ProductId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildProductEntity } from "./product.fixtures";

interface StoredProduct {
  record: ReturnType<Product["toProps"]>;
  metadata: ProductMetadata;
}

const EMPTY_METADATA: ProductMetadata = {
  tagIds: [],
  images: [],
  specifications: [],
  attributeValues: [],
  variantCount: 0,
};

function toProductRecord(stored: StoredProduct): ProductRecord {
  return {
    product: Product.reconstitute(stored.record),
    metadata: structuredClone(stored.metadata),
  };
}

export class InMemoryProductRepository implements IProductRepository {
  private readonly store = new Map<string, StoredProduct>();

  snapshot(): Map<string, StoredProduct> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        {
          record: structuredClone(value.record),
          metadata: structuredClone(value.metadata),
        },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredProduct>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, {
        record: structuredClone(value.record),
        metadata: structuredClone(value.metadata),
      });
    }
  }

  seed(products: Product[]): void {
    this.store.clear();
    for (const product of products) {
      const props = product.toProps();
      this.store.set(props.id, {
        record: props,
        metadata: structuredClone(EMPTY_METADATA),
      });
    }
  }

  findById(id: ProductId): Promise<ProductRecord | null> {
    const stored = this.store.get(id);
    return Promise.resolve(stored ? toProductRecord(stored) : null);
  }

  findByProductCode(productCode: string): Promise<ProductRecord | null> {
    for (const stored of this.store.values()) {
      if (stored.record.productCode === productCode) {
        return Promise.resolve(toProductRecord(stored));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(query: ProductListQuery): Promise<PaginatedResult<ProductRecord>> {
    let items = Array.from(this.store.values()).map(toProductRecord);

    if (query.isActive !== undefined) {
      items = items.filter((item) => item.product.isActive === query.isActive);
    }

    if (query.categoryId !== undefined) {
      items = items.filter(
        (item) => item.product.categoryId === query.categoryId,
      );
    }

    if (query.brandId !== undefined) {
      items = items.filter((item) => item.product.brandId === query.brandId);
    }

    if (query.tagId !== undefined) {
      items = items.filter((item) =>
        item.metadata.tagIds.includes(query.tagId!),
      );
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter((item) => {
        const product = item.product;
        return (
          product.name.toLowerCase().includes(term) ||
          product.productCode.toLowerCase().includes(term) ||
          (product.description?.toLowerCase().includes(term) ?? false) ||
          product.unit.toLowerCase().includes(term)
        );
      });
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left.product[query.sortBy as keyof Product] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right.product[query.sortBy as keyof Product] ?? "",
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

  async create(data: CreateProductData): Promise<ProductRecord> {
    const normalized = Product.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as ProductId;

    const product = Product.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    const metadata: ProductMetadata = {
      tagIds: data.tagIds ? [...data.tagIds] : [],
      images: (data.images ?? []).map((image, index) => ({
        id: crypto.randomUUID(),
        url: image.url,
        altText: image.altText ?? null,
        sortOrder: image.sortOrder ?? index,
        isPrimary: image.isPrimary ?? index === 0,
      })),
      specifications: (data.specifications ?? []).map((specification, index) => ({
        id: crypto.randomUUID(),
        key: specification.key,
        value: specification.value,
        sortOrder: specification.sortOrder ?? index,
      })),
      attributeValues: (data.attributeValues ?? []).map((attributeValue) => ({
        id: crypto.randomUUID(),
        attributeId: attributeValue.attributeId,
        value: attributeValue.value,
      })),
      variantCount: 0,
    };

    this.store.set(id, { record: product.toProps(), metadata });
    return toProductRecord(this.store.get(id)!);
  }

  async update(id: ProductId, data: UpdateProductData): Promise<ProductRecord> {
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
      categoryId:
        data.categoryId !== undefined
          ? data.categoryId
          : existing.record.categoryId,
      brandId:
        data.brandId !== undefined ? data.brandId : existing.record.brandId,
      unitId: data.unitId !== undefined ? data.unitId : existing.record.unitId,
      updatedAt: new Date(),
    });

    const metadata: ProductMetadata = {
      tagIds:
        data.tagIds !== undefined ? [...data.tagIds] : existing.metadata.tagIds,
      images:
        data.images !== undefined
          ? data.images.map((image, index) => ({
              id: crypto.randomUUID(),
              url: image.url,
              altText: image.altText ?? null,
              sortOrder: image.sortOrder ?? index,
              isPrimary: image.isPrimary ?? index === 0,
            }))
          : existing.metadata.images,
      specifications:
        data.specifications !== undefined
          ? data.specifications.map((specification, index) => ({
              id: crypto.randomUUID(),
              key: specification.key,
              value: specification.value,
              sortOrder: specification.sortOrder ?? index,
            }))
          : existing.metadata.specifications,
      attributeValues:
        data.attributeValues !== undefined
          ? data.attributeValues.map((attributeValue) => ({
              id: crypto.randomUUID(),
              attributeId: attributeValue.attributeId,
              value: attributeValue.value,
            }))
          : existing.metadata.attributeValues,
      variantCount: existing.metadata.variantCount,
    };

    this.store.set(id, { record: updated.toProps(), metadata });
    return toProductRecord(this.store.get(id)!);
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
