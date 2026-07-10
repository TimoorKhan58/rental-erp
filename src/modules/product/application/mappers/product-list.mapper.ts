import type { ProductListQuery } from "@/modules/product/domain/product-list.query";
import type {
  BrandId,
  CategoryId,
  ProductAttributeId,
  ProductTagId,
  UnitOfMeasureId,
} from "@/shared/domain/ids";

import type { ListProductsInput } from "../schemas/list-products.schema";

export function toProductListQuery(input: ListProductsInput): ProductListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    isActive: input.isActive,
    categoryId: input.categoryId as CategoryId | undefined,
    brandId: input.brandId as BrandId | undefined,
    tagId: input.tagId as ProductTagId | undefined,
  };
}

export function toCategoryId(id: string): CategoryId {
  return id as CategoryId;
}

export function toBrandId(id: string): BrandId {
  return id as BrandId;
}

export function toUnitOfMeasureId(id: string): UnitOfMeasureId {
  return id as UnitOfMeasureId;
}

export function toProductTagId(id: string): ProductTagId {
  return id as ProductTagId;
}

export function toProductAttributeId(id: string): ProductAttributeId {
  return id as ProductAttributeId;
}
